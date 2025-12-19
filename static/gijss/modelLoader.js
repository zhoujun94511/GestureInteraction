/**
 * Universal 3D Model Loader and Point Cloud Generator
 * 
 * This module provides functionality to:
 * - Load 3D models (GLTF/GLB format)
 * - Convert 3D meshes to particle point clouds
 * - Apply point clouds to particle systems
 * 
 * @module modelLoader
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PARTICLE_COUNT } from './config.js';

/**
 * Universal 3D Model Loader
 * Supports GLTF/GLB models using ES6 imports
 * 
 * @class ModelLoader
 */
class ModelLoader {
    /**
     * Load a 3D model from URL
     * @param {string} url - Path to the model file (GLTF/GLB)
     * @param {Object} options - Loading options
     * @param {Function} options.onProgress - Progress callback
     * @returns {Promise<THREE.Object3D>} The loaded model scene
     */
    static async loadModel(url, options = {}) {
        return new Promise((resolve, reject) => {
            const loader = new GLTFLoader();
            loader.load(
                url,
                gltf => {
                    console.log(`[ModelLoader] ✓ Model loaded: ${url}`);
                    resolve(gltf.scene);
                },
                options.onProgress,
                err => {
                    console.error(`[ModelLoader] ✗ Failed to load: ${url}`, err);
                    reject(err);
                }
            );
        });
    }
}

/**
 * Point Cloud Generator from 3D Models
 * Converts 3D mesh models to particle point clouds with improved compatibility
 * 
 * @class PointCloudGenerator
 */
class PointCloudGenerator {
    /**
     * Preprocess model: flatten hierarchy and merge geometries with per-mesh tracking
     * @param {THREE.Object3D} model - The 3D model object
     * @returns {Object} Processed geometry data with per-mesh information
     */
    static preprocessModel(model) {
        model.updateMatrixWorld(true);
        
        const allVertices = [];
        const allFaces = [];
        const meshes = []; // Track each mesh separately for better sampling
        const box = new THREE.Box3();
        let meshCount = 0;
        let totalVertices = 0;
        let totalFaces = 0;

        // Traverse all meshes in the model hierarchy
        model.traverse(child => {
            if (child.isMesh && child.geometry) {
                const geometry = child.geometry;
                
                // Ensure geometry has position attribute
                if (!geometry.attributes.position) {
                    console.warn(`[PointCloudGenerator] Mesh has no position attribute, skipping`);
                    return;
                }

                const pos = geometry.attributes.position;
                const index = geometry.index;
                const matrix = child.matrixWorld;
                
                // Store mesh-specific data for better sampling distribution
                const meshData = {
                    name: child.name || `Mesh_${meshCount}`,
                    vertices: [],
                    faces: [],
                    vertexStartIdx: allVertices.length,
                    faceStartIdx: allFaces.length
                };

                if (index) {
                    // Indexed geometry - extract vertices and faces
                    const vertexMap = new Map();
                    const localVertices = [];
                    
                    // Collect unique vertices
                    for (let i = 0; i < index.count; i++) {
                        const idx = index.getX(i);
                        if (!vertexMap.has(idx)) {
                            const v = new THREE.Vector3(
                                pos.getX(idx),
                                pos.getY(idx),
                                pos.getZ(idx)
                            );
                            v.applyMatrix4(matrix);
                            vertexMap.set(idx, allVertices.length + localVertices.length);
                            localVertices.push(v);
                            allVertices.push(v);
                            box.expandByPoint(v);
                        }
                    }
                    
                    // Extract faces
                    for (let i = 0; i < index.count; i += 3) {
                        if (i + 2 >= index.count) break;
                        
                        const i0 = index.getX(i);
                        const i1 = index.getX(i + 1);
                        const i2 = index.getX(i + 2);
                        
                        const v0 = new THREE.Vector3(
                            pos.getX(i0),
                            pos.getY(i0),
                            pos.getZ(i0)
                        );
                        const v1 = new THREE.Vector3(
                            pos.getX(i1),
                            pos.getY(i1),
                            pos.getZ(i1)
                        );
                        const v2 = new THREE.Vector3(
                            pos.getX(i2),
                            pos.getY(i2),
                            pos.getZ(i2)
                        );
                        
                        v0.applyMatrix4(matrix);
                        v1.applyMatrix4(matrix);
                        v2.applyMatrix4(matrix);
                        
                        // Calculate face area and skip degenerate triangles
                        const edge1 = v1.clone().sub(v0);
                        const edge2 = v2.clone().sub(v0);
                        const area = edge1.cross(edge2).length() * 0.5;
                        if (area > 1e-6) {
                            const face = { v0, v1, v2, area, meshIndex: meshCount };
                            allFaces.push(face);
                            meshData.faces.push(face);
                            totalFaces++;
                        }
                    }
                    
                    meshData.vertices = localVertices;
                } else {
                    // Non-indexed geometry
                    const localVertices = [];
                    for (let i = 0; i < pos.count; i++) {
                        const v = new THREE.Vector3(
                            pos.getX(i),
                            pos.getY(i),
                            pos.getZ(i)
                        );
                        v.applyMatrix4(matrix);
                        localVertices.push(v);
                        allVertices.push(v);
                        box.expandByPoint(v);
                    }
                    
                    // Extract faces from non-indexed geometry
                    for (let i = 0; i < pos.count; i += 3) {
                        if (i + 2 >= pos.count) break;
                        
                        const v0 = new THREE.Vector3(
                            pos.getX(i),
                            pos.getY(i),
                            pos.getZ(i)
                        );
                        const v1 = new THREE.Vector3(
                            pos.getX(i + 1),
                            pos.getY(i + 1),
                            pos.getZ(i + 1)
                        );
                        const v2 = new THREE.Vector3(
                            pos.getX(i + 2),
                            pos.getY(i + 2),
                            pos.getZ(i + 2)
                        );
                        
                        v0.applyMatrix4(matrix);
                        v1.applyMatrix4(matrix);
                        v2.applyMatrix4(matrix);
                        
                        // Calculate face area and skip degenerate triangles
                        const edge1 = v1.clone().sub(v0);
                        const edge2 = v2.clone().sub(v0);
                        const area = edge1.cross(edge2).length() * 0.5;
                        if (area > 1e-6) {
                            const face = { v0, v1, v2, area, meshIndex: meshCount };
                            allFaces.push(face);
                            meshData.faces.push(face);
                            totalFaces++;
                        }
                    }
                    
                    meshData.vertices = localVertices;
                }
                
                totalVertices += pos.count;
                meshData.vertexCount = meshData.vertices.length;
                meshData.faceCount = meshData.faces.length;
                meshData.vertexEndIdx = allVertices.length;
                meshData.faceEndIdx = allFaces.length;
                
                meshes.push(meshData);
                meshCount++;
            }
        });

        console.log(`[PointCloudGenerator] Processed ${meshCount} mesh(es): ${totalVertices} vertices, ${totalFaces} faces`);
        
        // Log per-mesh statistics for debugging
        if (meshes.length > 0) {
            console.log(`[PointCloudGenerator] Mesh breakdown:`);
            meshes.forEach((mesh, idx) => {
                console.log(`  - ${mesh.name}: ${mesh.vertexCount} vertices, ${mesh.faceCount} faces`);
            });
        }

        return {
            vertices: allVertices,
            faces: allFaces,
            meshes: meshes,
            boundingBox: box,
            meshCount,
            totalVertices,
            totalFaces
        };
    }

    /**
     * Convert mesh to point cloud with improved per-mesh sampling distribution
     * @param {THREE.Object3D} model - The 3D model object
     * @param {Object} options - Generation options
     * @param {number} options.targetCount - Target number of particles (default: PARTICLE_COUNT)
     * @param {number} options.targetSize - Target size for auto-scaling (default: 4.5)
     * @param {THREE.Euler|Array<number>} options.rotation - Rotation to apply (default: [0, Math.PI, 0])
     * @param {number} options.scale - Manual scale override (if provided, overrides auto-scale)
     * @param {string} options.samplingMethod - Sampling method: 'auto' | 'hybrid' | 'uniform' | 'surface' (default: 'auto')
     * @param {number} options.surfaceDensity - Surface sampling ratio (0.0-1.0, default: 0.85)
     * @param {number} options.minPointsPerMesh - Minimum points per mesh (default: auto-calculated)
     * @returns {Array<THREE.Vector3>} Array of sampled point positions
     */
    static meshToPointCloud(model, options = {}) {
        const {
            targetCount = PARTICLE_COUNT,
            targetSize = 4.5,
            rotation = new THREE.Euler(0, Math.PI, 0),
            scale: manualScale = null,
            samplingMethod = 'auto',
            surfaceDensity = 0.85,
            minPointsPerMesh = null
        } = options;

        // Preprocess model to extract all geometry with per-mesh tracking
        const { vertices, faces, meshes, boundingBox, meshCount } = this.preprocessModel(model);

        if (vertices.length === 0) {
            console.error('[PointCloudGenerator] No vertices found in model');
            return [];
        }

        // Calculate bounding box center to center the model
        const center = new THREE.Vector3();
        boundingBox.getCenter(center);
        console.log(`[PointCloudGenerator] Model center: (${center.x.toFixed(2)}, ${center.y.toFixed(2)}, ${center.z.toFixed(2)})`);
        
        // Calculate scaling
        let scale;
        if (manualScale !== null) {
            scale = manualScale;
        } else {
            const size = boundingBox.getSize(new THREE.Vector3());
            const maxDimension = Math.max(size.x, size.y, size.z);
            if (maxDimension > 0) {
                scale = targetSize / maxDimension;
            } else {
                scale = 1.0;
                console.warn('[PointCloudGenerator] Invalid bounding box, using scale 1.0');
            }
        }

        // Normalize rotation
        const euler = rotation instanceof THREE.Euler 
            ? rotation 
            : new THREE.Euler(rotation[0], rotation[1], rotation[2]);

        // Auto-select sampling method if 'auto'
        let actualMethod = samplingMethod;
        if (samplingMethod === 'auto') {
            // Use hybrid sampling (surface + vertex) for best results
            if (faces.length > 0 && meshCount > 1) {
                actualMethod = 'hybrid';
            } else if (faces.length > 0) {
                actualMethod = 'surface';
            } else if (vertices.length >= targetCount) {
                actualMethod = 'uniform';
            } else {
                actualMethod = 'hybrid';
            }
            console.log(`[PointCloudGenerator] Auto-selected sampling method: ${actualMethod}`);
        }

        // Sample points based on method
        const sampled = [];
        
        if ((actualMethod === 'hybrid' || actualMethod === 'surface') && faces.length > 0 && meshes.length > 0) {
            // ========== HYBRID SAMPLING: Per-Mesh Fair Distribution ==========
            // This ensures all mesh components get adequate representation
            
            // Calculate minimum points per mesh to ensure coverage
            // For models with many meshes (20+), ensure each mesh gets sufficient representation
            const calculatedMinPointsPerMesh = minPointsPerMesh || Math.max(
                Math.floor(targetCount * 0.08 / meshCount), // At least 8% total points distributed (increased from 5%)
                Math.min(150, Math.floor(targetCount / (meshCount * 2.5))), // Or 1/2.5 of average (increased from 1/3)
                80 // Absolute minimum of 80 points per mesh for complex models
            );
            
            // Calculate total surface area
            let totalArea = 0;
            const meshAreas = meshes.map(mesh => {
                let area = 0;
                mesh.faces.forEach(face => {
                    area += face.area || 1e-6;
                });
                return area;
            });
            totalArea = meshAreas.reduce((sum, area) => sum + area, 0);
            
            console.log(`[PointCloudGenerator] Hybrid sampling - Minimum ${calculatedMinPointsPerMesh} points per mesh`);
            
            // Step 1: Allocate minimum points to each mesh
            const meshPointAllocations = new Array(meshes.length).fill(calculatedMinPointsPerMesh);
            let pointsAllocated = calculatedMinPointsPerMesh * meshes.length;
            
            // Step 2: Distribute remaining points based on surface area ratio
            const remainingPoints = targetCount - pointsAllocated;
            if (remainingPoints > 0 && totalArea > 0) {
                for (let meshIdx = 0; meshIdx < meshes.length; meshIdx++) {
                    const areaRatio = meshAreas[meshIdx] / totalArea;
                    const additionalPoints = Math.floor(remainingPoints * areaRatio);
                    meshPointAllocations[meshIdx] += additionalPoints;
                }
            }
            
            // Log allocation for debugging
            console.log(`[PointCloudGenerator] Point allocation per mesh:`);
            meshes.forEach((mesh, idx) => {
                console.log(`  - ${mesh.name}: ${meshPointAllocations[idx]} points (${mesh.faceCount} faces, ${(meshAreas[idx]/totalArea*100).toFixed(1)}% area)`);
            });
            
            // Step 3: Sample points from each mesh
            for (let meshIdx = 0; meshIdx < meshes.length; meshIdx++) {
                const mesh = meshes[meshIdx];
                const targetPointsForMesh = meshPointAllocations[meshIdx];
                const meshSampled = [];
                
                // Use hybrid approach: surface + vertex sampling
                const surfaceRatio = actualMethod === 'hybrid' ? surfaceDensity : 1.0;
                const surfacePoints = Math.floor(targetPointsForMesh * surfaceRatio);
                const vertexPoints = targetPointsForMesh - surfacePoints;
                
                // Sample from faces (surface sampling)
                if (mesh.faces.length > 0 && surfacePoints > 0) {
                    const meshTotalArea = meshAreas[meshIdx];
                    const pointsPerUnitArea = surfacePoints / Math.max(meshTotalArea, 1e-6);
                    
                    for (let faceIdx = 0; faceIdx < mesh.faces.length && meshSampled.length < surfacePoints; faceIdx++) {
                        const face = mesh.faces[faceIdx];
                        const faceArea = face.area || 1e-6;
                        // Ensure at least 1 point per face if face has significant area
                        const pointsOnFace = Math.max(
                            faceArea > 1e-4 ? 1 : 0,
                            Math.floor(faceArea * pointsPerUnitArea)
                        );
                        
                        const edge1 = face.v1.clone().sub(face.v0);
                        const edge2 = face.v2.clone().sub(face.v0);
                        
                        // Sample points on triangle using barycentric coordinates
                        for (let i = 0; i < pointsOnFace && meshSampled.length < surfacePoints; i++) {
                            let u = Math.random();
                            let v = Math.random();
                            
                            // Ensure point is inside triangle
                            if (u + v > 1) {
                                u = 1 - u;
                                v = 1 - v;
                            }
                            
                            const point = face.v0.clone()
                                .add(edge1.clone().multiplyScalar(u))
                                .add(edge2.clone().multiplyScalar(v));
                            
                            point.sub(center);          // Center the model
                            point.multiplyScalar(scale);
                            point.applyEuler(euler);
                            meshSampled.push(point);
                        }
                    }
                }
                
                // Sample from vertices (vertex sampling) to ensure coverage
                if (mesh.vertices.length > 0 && vertexPoints > 0) {
                    const step = Math.max(1, mesh.vertices.length / vertexPoints);
                    for (let i = 0; i < vertexPoints && meshSampled.length < targetPointsForMesh; i++) {
                        const idx = Math.min(Math.floor(i * step), mesh.vertices.length - 1);
                        const v = mesh.vertices[idx].clone();
                        v.sub(center);          // Center the model
                        v.multiplyScalar(scale);
                        v.applyEuler(euler);
                        meshSampled.push(v);
                    }
                }
                
                // Fill any remaining points with random sampling from this mesh
                while (meshSampled.length < targetPointsForMesh && mesh.vertices.length > 0) {
                    const idx = Math.floor(Math.random() * mesh.vertices.length);
                    const v = mesh.vertices[idx].clone();
                    v.sub(center);          // Center the model
                    v.multiplyScalar(scale);
                    v.applyEuler(euler);
                    meshSampled.push(v);
                }
                
                // Add to final sampled array
                sampled.push(...meshSampled);
            }
            
            console.log(`[PointCloudGenerator] Hybrid sampling complete: ${sampled.length} points from ${meshes.length} meshes`);
            
        } else if (actualMethod === 'uniform' && vertices.length >= targetCount) {
            // Uniform sampling: evenly distribute indices
            const step = vertices.length / targetCount;
            for (let i = 0; i < targetCount; i++) {
                const idx = Math.min(Math.floor(i * step), vertices.length - 1);
                const v = vertices[idx].clone();
                v.sub(center);          // Center the model
                v.multiplyScalar(scale);
                v.applyEuler(euler);
                sampled.push(v);
            }
        } else {
            // Random sampling (fallback)
            const sampleCount = Math.min(targetCount, vertices.length * 2);
            for (let i = 0; i < sampleCount; i++) {
                const idx = Math.floor(Math.random() * vertices.length);
                const v = vertices[idx].clone();
                v.sub(center);          // Center the model
                v.multiplyScalar(scale);
                v.applyEuler(euler);
                sampled.push(v);
            }
            
            // If we still need more points, duplicate randomly
            while (sampled.length < targetCount) {
                const idx = Math.floor(Math.random() * sampled.length);
                sampled.push(sampled[idx].clone());
            }
        }

        // Ensure we have exactly targetCount points
        while (sampled.length < targetCount && vertices.length > 0) {
            const idx = Math.floor(Math.random() * vertices.length);
            const v = vertices[idx].clone();
            v.sub(center);          // Center the model
            v.multiplyScalar(scale);
            v.applyEuler(euler);
            sampled.push(v);
        }

        // Shuffle to avoid clustering and ensure random distribution
        for (let i = sampled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [sampled[i], sampled[j]] = [sampled[j], sampled[i]];
        }

        const result = sampled.slice(0, targetCount);
        console.log(`[PointCloudGenerator] Generated ${result.length} points from model`);
        
        return result;
    }

    /**
     * Apply point cloud to particle targets
     * @param {Array<THREE.Vector3>} points - Point cloud array
     * @param {Float32Array} targets - Target positions array (State.targets)
     */
    static applyToTargets(points, targets) {
        for (let i = 0; i < points.length && i * 3 + 2 < targets.length; i++) {
            const p = points[i];
            const idx = i * 3;
            targets[idx] = p.x;
            targets[idx + 1] = p.y;
            targets[idx + 2] = p.z;
        }
    }
}

// Export for external use
export { ModelLoader, PointCloudGenerator };

