import io
import os
import ssl
import time
import qrcode
import logging
import threading
import webbrowser
from tools.utils import get_local_ip
from flask import Flask, render_template, send_file, send_from_directory, request



app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

# favicon定义
@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.root_path, 'static', 'giresource'), 'favicon.ico')

@app.route('/download-cert')
def download_cert():
    """下载自签证书"""
    cert_path = os.path.join('ssl', 'server.crt')
    if os.path.exists(cert_path):
        return send_file(
            cert_path,
            as_attachment=True,
            download_name='server.crt',
            mimetype='application/x-x509-ca-cert'
        )
    else:
        return "证书文件不存在", 404

# 生成二维码路由
@app.route('/generate_qr')
def generate_qr():
    url = request.url_root
    logging.info(f'Generated QR code for URL: {url}')

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill='black', back_color='white')

    img_io = io.BytesIO()
    img.save(img_io, 'PNG')
    img_io.seek(0)
    return send_file(img_io, mimetype='image/png')

# ===== 自启动浏览器 =====
use_local_ip = get_local_ip()

def open_browser():
    time.sleep(1)
    webbrowser.open_new_tab(f'https://{use_local_ip}:5001')

# if __name__ == '__main__':
#
#     # 正确加载 crt + key，而不是 p12 !!
#     context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
#     context.load_cert_chain(
#         certfile="ssl/server.crt",
#         keyfile="ssl/server.key"
#     )
#
#     # 自动打开浏览器
#     if not hasattr(app, 'browser_opened') or not app.browser_opened:
#         threading.Thread(target=open_browser).start()
#         app.browser_opened = True
#     print("Binding to:", use_local_ip)
#
#     # 启动 HTTPS 服务
#     app.run(
#         host=use_local_ip,
#         port=5001,
#         debug=True,
#         use_reloader=False,
#         ssl_context=context
#     )

if __name__ == '__main__':

    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain(
        certfile="ssl/server.crt",
        keyfile="ssl/server.key"
    )

    def open_browser():
        time.sleep(1)
        webbrowser.open_new_tab('https://localhost:5001')

    threading.Thread(target=open_browser).start()

    app.run(
        host="0.0.0.0",
        port=5001,
        debug=True,
        use_reloader=False,
        ssl_context=context
    )

