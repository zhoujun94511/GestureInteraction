#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
自动生成 SSL 自签证书脚本
用于 GestureInteraction 项目的 HTTPS 服务
"""

import os
import sys
import ipaddress
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import rsa
from datetime import datetime, timedelta, timezone

# 导入工具函数获取本地IP
try:
    from utils import get_local_ip
except ImportError:
    print("警告: 无法导入 utils.get_local_ip，将使用默认IP")
    def get_local_ip():
        return "127.0.0.1"

def validate_ip_address(ip_str):
    """验证 IP 地址格式"""
    try:
        ipaddress.IPv4Address(ip_str)
        return True
    except (ipaddress.AddressValueError, ValueError):
        return False

def ensure_ssl_directory():
    """确保 ssl 目录存在"""
    ssl_dir = "../ssl"
    if not os.path.exists(ssl_dir):
        os.makedirs(ssl_dir)
        print(f"已创建目录: {ssl_dir}/")
    return ssl_dir

def check_existing_certificates(ssl_dir):
    """检查证书是否已存在"""
    key_path = os.path.join(ssl_dir, "server.key")
    cert_path = os.path.join(ssl_dir, "server.crt")
    
    key_exists = os.path.exists(key_path)
    cert_exists = os.path.exists(cert_path)
    
    if key_exists or cert_exists:
        response = input(f"检测到已存在的证书文件，是否覆盖？(y/N): ").strip().lower()
        if response != 'y':
            print("已取消，保留现有证书")
            return False
        print("将覆盖现有证书...")
    return True

def generate_certificate(ssl_dir, local_ip, days=365):
    """生成 SSL 证书和私钥"""
    
    print(f"正在生成证书...")
    print(f"目标IP: {local_ip}")
    print(f"有效期: {days} 天")
    
    # 生成私钥
    print("1. 生成 RSA 私钥 (2048位)...")
    key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
    )
    
    # 保存私钥
    key_path = os.path.join(ssl_dir, "server.key")
    with open(key_path, "wb") as f:
        f.write(key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.TraditionalOpenSSL,
            encryption_algorithm=serialization.NoEncryption(),
        ))
    print(f"   ✓ 私钥已保存: {key_path}")
    
    # 证书主题信息
    print("2. 配置证书信息...")
    subject = issuer = x509.Name([
        x509.NameAttribute(NameOID.COUNTRY_NAME, "CN"),
        x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, "Local"),
        x509.NameAttribute(NameOID.LOCALITY_NAME, "Local"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, "GestureInteraction"),
        x509.NameAttribute(NameOID.ORGANIZATIONAL_UNIT_NAME, "Development"),
        x509.NameAttribute(NameOID.COMMON_NAME, local_ip),
    ])
    
    # 生成证书
    print("3. 生成证书...")
    not_before = datetime.now(timezone.utc)
    not_after = not_before + timedelta(days=days)
    
    # Subject Alternative Name: 包含 IP 地址和 localhost
    san_list = [
        x509.IPAddress(ipaddress.IPv4Address(local_ip)),
        x509.IPAddress(ipaddress.IPv6Address("::1")),  # IPv6 localhost
        x509.DNSName("localhost"),
        x509.DNSName(local_ip),
    ]
    
    # 构建证书（使用链式调用，CertificateBuilder 支持流畅接口）
    builder = x509.CertificateBuilder()
    builder = builder.subject_name(subject)
    builder = builder.issuer_name(issuer)
    builder = builder.public_key(key.public_key())
    builder = builder.serial_number(x509.random_serial_number())
    builder = builder.not_valid_before(not_before)
    builder = builder.not_valid_after(not_after)
    builder = builder.add_extension(
        x509.SubjectAlternativeName(san_list),
        critical=False
    )
    builder = builder.add_extension(
        x509.ExtendedKeyUsage([
            x509.ExtendedKeyUsageOID.SERVER_AUTH,
        ]),
        critical=False
    )
    builder = builder.add_extension(
        x509.KeyUsage(
            key_encipherment=True,
            digital_signature=True,
            key_agreement=False,
            key_cert_sign=False,
            content_commitment=False,
            data_encipherment=False,
            encipher_only=False,
            decipher_only=False,
            crl_sign=False,
        ),
        critical=True
    )
    cert = builder.sign(key, hashes.SHA256())
    
    # 保存证书
    cert_path = os.path.join(ssl_dir, "server.crt")
    with open(cert_path, "wb") as f:
        f.write(cert.public_bytes(serialization.Encoding.PEM))
    print(f"   ✓ 证书已保存: {cert_path}")
    
    return key_path, cert_path

def main():
    """主函数"""
    print("=" * 60)
    print("SSL 自签证书生成工具")
    print("=" * 60)
    
    # 确保 ssl 目录存在
    ssl_dir = ensure_ssl_directory()
    
    # 检查现有证书
    if not check_existing_certificates(ssl_dir):
        return
    
    # 获取本地IP
    try:
        local_ip = get_local_ip()
        print(f"\n检测到本地IP: {local_ip}")
    except Exception as e:
        print(f"警告: 无法获取本地IP ({e})，使用 127.0.0.1")
        local_ip = "127.0.0.1"
    
    # 允许用户自定义IP
    custom_ip = input(f"使用此IP生成证书？(直接回车确认，或输入其他IP): ").strip()
    
    # 处理用户输入
    if custom_ip:
        # 如果输入的是 y/yes，使用检测到的 IP
        if custom_ip.lower() in ['y', 'yes', '是']:
            print(f"将使用检测到的IP: {local_ip}")
        # 如果输入的是有效的 IP 地址，使用自定义 IP
        elif validate_ip_address(custom_ip):
            local_ip = custom_ip
            print(f"将使用自定义IP: {local_ip}")
        else:
            print(f"错误: '{custom_ip}' 不是有效的 IPv4 地址格式")
            print(f"示例格式: 192.168.1.100")
            print(f"将使用检测到的IP: {local_ip}")
    
    # 生成证书
    try:
        key_path, cert_path = generate_certificate(ssl_dir, local_ip)
        
        print("\n" + "=" * 60)
        print("✓ 证书生成成功！")
        print("=" * 60)
        print(f"私钥文件: {key_path}")
        print(f"证书文件: {cert_path}")
        print("\n下一步操作:")
        print("1. 启动应用: python app.py")
        print("2. 访问应用时会提示证书不安全")
        print("3. 点击'下载证书'按钮下载证书")
        print("4. 安装证书到系统信任列表")
        print("5. 刷新页面即可正常访问")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n错误: 证书生成失败 - {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
