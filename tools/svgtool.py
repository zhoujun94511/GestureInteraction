"""""
单一：
python svgtool.py input.jpg output.svg

批量：
python svgtool.py imgs/ svg_output/

多线程：
python svgtool.py imgs/ svg_output/ --threads 16
"""""

import cv2
import argparse
import time
import logging
from pathlib import Path
from datetime import datetime
from threading import Lock
from concurrent.futures import ThreadPoolExecutor, as_completed

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("svgtool")

_timestamp_lock = Lock()
_last_ms = 0


def timestamp_now():
    """生成单调递增且线程安全的毫秒时间戳字符串: YYYYMMDD_HHMMSS_mmm"""
    global _last_ms
    with _timestamp_lock:
        now_ms = int(time.time() * 1000)
        if now_ms <= _last_ms:
            now_ms = _last_ms + 1
        _last_ms = now_ms
    dt = datetime.fromtimestamp(now_ms / 1000.0)
    ms = now_ms % 1000
    return dt.strftime("%Y%m%d_%H%M%S_") + f"{ms:03d}"


def preprocess_image(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (5, 5), 0)
    gray = cv2.bilateralFilter(gray, 9, 75, 75)
    return gray


def threshold_image(gray):
    h, w = gray.shape
    corners = [gray[0, 0], gray[0, w - 1], gray[h - 1, 0], gray[h - 1, w - 1]]
    avg_corner = sum(corners) / 4

    if avg_corner > 127:
        _, thresh = cv2.threshold(gray, 0, 255,
                                  cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    else:
        _, thresh = cv2.threshold(gray, 0, 255,
                                  cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    return thresh


def contours_to_svg(contours, width, height):
    svg_data = [
        f'<svg version="1.1" xmlns="http://www.w3.org/2000/svg" '
        f'width="{width}" height="{height}" viewBox="0 0 {width} {height}">',
        '<path fill="black" stroke="black" fill-rule="evenodd" d="'
    ]

    for cnt in contours:
        if len(cnt) < 3:
            continue

        epsilon = 0.002 * cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, epsilon, True)

        start = approx[0][0]
        svg_data.append(f'M {start[0]} {start[1]} ')

        for p in approx[1:]:
            x, y = p[0]
            svg_data.append(f'L {x} {y} ')

        svg_data.append('Z ')

    svg_data.append('"/></svg>')
    return ''.join(svg_data)


def convert_to_svg(src_path: Path, dst_path: Path):
    img = cv2.imread(str(src_path))
    if img is None:
        logger.error("❌ 无法读取图像: %s", src_path)
        return False

    h, w = img.shape[:2]

    gray = preprocess_image(img)
    thresh = threshold_image(gray)
    contours, _ = cv2.findContours(
        thresh, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE
    )

    svg_content = contours_to_svg(contours, w, h)

    with open(dst_path, "w", encoding="utf-8") as f:
        f.write(svg_content)

    logger.info("✅ 生成: %s", dst_path)

    return True


def is_image_file(path: Path):
    ext = path.suffix.lower().lstrip(".")
    return ext in ["jpg", "jpeg", "png", "bmp", "webp"]


def scan_images_recursively(folder: Path):
    """递归扫描所有图片路径"""
    return [p for p in folder.rglob("*") if p.is_file() and is_image_file(p)]


# ---------------------- CLI 入口 ------------------------
if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="位图 → SVG 转换工具（支持递归扫描 + 多线程批量转换）"
    )

    parser.add_argument("input", help="输入文件或文件夹路径")
    parser.add_argument("output", help="输出文件或文件夹路径")

    parser.add_argument(
        "--threads",
        type=int,
        default=8,
        help="线程数（默认 8）"
    )

    args = parser.parse_args()

    cli_input_path = Path(args.input).expanduser()
    cli_output_path = Path(args.output).expanduser()
    threads = args.threads

    # -----------------------------------------------------------
    # 🟦 输入是文件 → 单文件模式
    # -----------------------------------------------------------
    if cli_input_path.is_file():

        if cli_output_path.is_dir():
            basename = cli_input_path.stem
            timestamp = timestamp_now()
            output_file = cli_output_path / f"{basename}_{timestamp}.svg"
        else:
            output_file = cli_output_path

        convert_to_svg(cli_input_path, output_file)
        exit()

    # -----------------------------------------------------------
    # 🟦 输入是文件夹 → 批量 + 递归扫描 + 多线程
    # -----------------------------------------------------------
    if cli_input_path.is_dir():

        cli_output_path.mkdir(parents=True, exist_ok=True)

        logger.info("📁 输入文件夹（递归扫描）: %s", cli_input_path)
        logger.info("📁 输出文件夹: %s", cli_output_path)
        logger.info("⚡ 使用线程数: %d", threads)

        # **** 递归扫描所有图片 ****
        images = scan_images_recursively(cli_input_path)

        if not images:
            logger.warning("⚠ 找不到任何图片文件！")
            exit()

        logger.info("🔍 找到 %d 张图片，准备转换…", len(images))

        tasks = []
        with ThreadPoolExecutor(max_workers=threads) as executor:
            for img_path in images:
                basename = img_path.stem
                timestamp = timestamp_now()
                out_name = f"{basename}_{timestamp}.svg"
                out_path = cli_output_path / out_name

                tasks.append(executor.submit(convert_to_svg, img_path, out_path))

            for future in as_completed(tasks):
                future.result()

        logger.info("🎉 批量（含子文件夹）转换完成！")
        exit()

    logger.error("❌ 输入路径不是文件也不是文件夹: %s", cli_input_path)


