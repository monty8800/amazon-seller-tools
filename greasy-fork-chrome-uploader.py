#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Greasy Fork Chrome上传工具
------------------------
这个脚本使用Playwright启动本地Chrome浏览器，帮助填写Greasy Fork上传表单。
它会自动填写表单内容，但不会自动提交，最后的提交按钮由用户手动点击。

作者: Monty & Assistant
版本: 1.0
日期: 2025-04-07
"""

import os
import sys
import re
import json
import argparse
import getpass
from pathlib import Path
from typing import Optional, Dict, Any
from datetime import datetime

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print("错误: 请先安装Playwright")
    print("运行: pip install playwright")
    print("然后: playwright install")
    sys.exit(1)

# 颜色定义
class Colors:
    BLUE = "\033[94m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    BOLD = "\033[1m"
    UNDERLINE = "\033[4m"
    END = "\033[0m"

def print_colored(text: str, color: str) -> None:
    """打印彩色文本"""
    print(f"{color}{text}{Colors.END}")

def extract_metadata(script_path: str) -> tuple:
    """从脚本中提取元数据"""
    metadata = {
        "name": "",
        "description": "",
        "version": "",
    }
    
    try:
        with open(script_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # 提取元数据
        name_match = re.search(r'@name\s+(.+)', content)
        if name_match:
            metadata["name"] = name_match.group(1).strip()
            
        desc_match = re.search(r'@description\s+(.+)', content)
        if desc_match:
            metadata["description"] = desc_match.group(1).strip()
            
        version_match = re.search(r'@version\s+(.+)', content)
        if version_match:
            metadata["version"] = version_match.group(1).strip()
            
        return metadata, content
    except Exception as e:
        print_colored(f"读取脚本文件失败: {e}", Colors.RED)
        sys.exit(1)

def extract_readme(readme_path: Optional[str] = None, script_path: Optional[str] = None) -> str:
    """提取README内容"""
    if not readme_path and script_path:
        # 尝试在脚本同目录下查找README文件
        script_dir = os.path.dirname(os.path.abspath(script_path))
        possible_readmes = [
            os.path.join(script_dir, "README.md"),
            os.path.join(script_dir, "readme.md"),
            os.path.join(script_dir, "README.txt"),
        ]
        
        for path in possible_readmes:
            if os.path.exists(path):
                readme_path = path
                break
    
    if readme_path and os.path.exists(readme_path):
        try:
            with open(readme_path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            print_colored(f"读取README文件失败: {e}", Colors.YELLOW)
    
    return ""

# 配置文件路径
# 使用脚本所在目录作为项目目录
PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(PROJECT_DIR, "config.json")
CONFIG_EXAMPLE_FILE = os.path.join(PROJECT_DIR, "config.json.example")

# 上传历史记录文件
UPLOAD_HISTORY_FILE = os.path.join(PROJECT_DIR, "upload_history.md")

def load_config() -> Dict[str, Any]:
    """加载配置文件"""
    default_config = {
        "username": "",
        "password": "",
        "last_script_id": "",
    }
    
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print_colored(f"读取配置文件失败: {e}", Colors.RED)
    
    return default_config

def save_config(config: Dict[str, Any]) -> None:
    """保存配置文件"""
    try:
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
        # 设置权限为仅用户可读写
        os.chmod(CONFIG_FILE, 0o600)
        print_colored("配置已安全保存", Colors.GREEN)
    except Exception as e:
        print_colored(f"保存配置文件失败: {e}", Colors.RED)

def get_credentials(username=None, password=None, save_config_flag=False) -> tuple:
    """获取登录凭据"""
    config = load_config()
    
    # 使用命令行参数中的凭据（如果提供）
    if username:
        config["username"] = username
    if password:
        config["password"] = password
    
    # 如果配置中没有凭据，从命令行输入
    if not config["username"] or not config["password"]:
        if not config["username"]:
            config["username"] = input("请输入Greasy Fork用户名或邮箱: ")
        if not config["password"]:
            config["password"] = getpass.getpass("请输入Greasy Fork密码: ")
    
    # 如果需要保存配置
    if save_config_flag and (config["username"] and config["password"]):
        save_config(config)
    
    return config["username"], config["password"]

def login_to_greasyfork(page, skip_login=False, username=None, password=None):
    """登录到Greasy Fork"""
    # 如果用户指定跳过登录，则直接返回
    if skip_login:
        print_colored("跳过登录步骤，使用现有浏览器会话", Colors.BLUE)
        return True
    
    print_colored("正在登录Greasy Fork...", Colors.BLUE)
    
    # 获取登录凭据
    username, password = get_credentials(username, password)
    
    # 访问登录页面
    page.goto("https://greasyfork.org/zh-CN/users/sign_in")
    
    # 等待页面加载
    try:
        page.wait_for_selector("#user_email", state="visible", timeout=10000)
    except:
        print_colored("警告: 页面加载超时，尝试继续操作...", Colors.YELLOW)
    
    # 填写登录表单
    try:
        # 使用安全获取的凭据
        page.fill("#user_email", username)
        page.fill("#user_password", password)
        
        # 点击登录按钮
        page.click('input[name="commit"]')
        
        # 等待登录完成
        try:
            page.wait_for_selector(".user-profile-link", timeout=10000)
            print_colored("登录成功！", Colors.GREEN)
            return True
        except:
            print_colored("警告: 登录可能失败，尝试继续操作...", Colors.YELLOW)
            return False
    except Exception as e:
        print_colored(f"登录过程出错: {e}", Colors.RED)
        return False

def update_script(script_id: str, script_path: str, readme_path: Optional[str] = None, chrome_path: Optional[str] = None, skip_login: bool = False) -> bool:
    """更新现有脚本（使用本地Chrome）"""
    print_colored(f"准备更新脚本 (ID: {script_id})...", Colors.BLUE)
    
    # 提取脚本元数据
    metadata, content = extract_metadata(script_path)
    readme_content = extract_readme(readme_path, script_path)
    
    # 显示脚本信息
    print_colored("脚本信息:", Colors.BLUE)
    print(f"  名称: {Colors.YELLOW}{metadata['name']}{Colors.END}")
    print(f"  描述: {metadata['description']}")
    print(f"  版本: {Colors.YELLOW}{metadata['version']}{Colors.END}")
    print(f"  脚本ID: {Colors.YELLOW}{script_id}{Colors.END}")
    print("")
    
    # 设置Chrome可执行文件路径
    if not chrome_path:
        # macOS上Chrome的默认路径
        chrome_path = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        if not os.path.exists(chrome_path):
            print_colored(f"警告: 未找到Chrome浏览器，将使用Playwright默认浏览器", Colors.YELLOW)
            chrome_path = None
    
    with sync_playwright() as p:
        # 启动Chrome浏览器
        print_colored("正在启动Chrome浏览器...", Colors.BLUE)
        
        try:
            if chrome_path:
                browser = p.chromium.launch(
                    executable_path=chrome_path,
                    headless=False,
                    channel="chrome"
                )
            else:
                browser = p.chromium.launch(headless=False)
            
            # 创建新的上下文和页面
            context = browser.new_context()
            page = context.new_page()
            
            # 先登录
            login_success = login_to_greasyfork(page, skip_login=skip_login)
            
            # 访问更新页面
            print_colored(f"正在打开Greasy Fork更新脚本页面 (ID: {script_id})...", Colors.BLUE)
            page.goto(f"https://greasyfork.org/zh-CN/scripts/{script_id}/versions/new")
            
            # 等待页面加载完成
            try:
                page.wait_for_selector("#script_version_code", state="visible", timeout=10000)
            except:
                print_colored("警告: 页面加载超时，尝试继续操作...", Colors.YELLOW)
            
            # 填写表单
            print_colored("正在填写表单...", Colors.BLUE)
            
            # 填写脚本代码
            try:
                code_editor = page.query_selector("#script_version_code")
                if code_editor:
                    page.fill("#script_version_code", content)
                    print_colored("已填写脚本代码", Colors.GREEN)
                else:
                    print_colored("警告: 未找到代码编辑框", Colors.YELLOW)
            except Exception as e:
                print_colored(f"填写脚本代码失败: {e}", Colors.RED)
            
            # 填写更新说明
            try:
                changelog = f"更新到版本 {metadata['version']}" if metadata['version'] else "更新脚本"
                changelog_editor = page.query_selector("#script_version_changelog")
                if changelog_editor:
                    page.fill("#script_version_changelog", changelog)
                    print_colored("已填写更新说明", Colors.GREEN)
                else:
                    print_colored("警告: 未找到更新说明编辑框", Colors.YELLOW)
            except Exception as e:
                print_colored(f"填写更新说明失败: {e}", Colors.RED)
            
            # 更新附加信息（如果有README且有附加信息编辑框）
            if readme_content:
                try:
                    # 尝试找到正确的附加信息编辑框
                    additional_info_selector = page.query_selector("#script-version-additional-info-0")
                    if additional_info_selector:
                        page.fill("#script-version-additional-info-0", readme_content)
                        print_colored("已填写附加信息", Colors.GREEN)
                    else:
                        # 尝试使用更精确的选择器
                        additional_info_selector = page.query_selector('textarea[name="script_version[additional_info][0][attribute_value]"]')
                        if additional_info_selector:
                            page.fill('textarea[name="script_version[additional_info][0][attribute_value]"]', readme_content)
                            print_colored("已填写附加信息", Colors.GREEN)
                        else:
                            print_colored("警告: 未找到附加信息编辑框，尝试使用旧选择器", Colors.YELLOW)
                            # 尝试旧的选择器作为后备
                            additional_info_selector = page.query_selector("#script_additional_info")
                            if additional_info_selector:
                                page.fill("#script_additional_info", readme_content)
                                print_colored("已使用旧选择器填写附加信息", Colors.GREEN)
                            else:
                                print_colored("警告: 所有尝试都未找到附加信息编辑框", Colors.YELLOW)
                except Exception as e:
                    print_colored(f"填写附加信息失败: {e}", Colors.RED)
            
            print_colored("\n表单已填写完成！", Colors.GREEN)
            print_colored("请手动检查表单内容并点击提交按钮。", Colors.YELLOW)
            print_colored("完成后请按Enter键关闭浏览器...", Colors.YELLOW)
            input()
            
        except Exception as e:
            print_colored(f"操作失败: {e}", Colors.RED)
        finally:
            # 关闭浏览器
            if 'browser' in locals():
                browser.close()

def create_new_script(script_path: str, readme_path: Optional[str] = None, script_type: str = "public", chrome_path: Optional[str] = None) -> Optional[str]:
    """创建新脚本（使用本地Chrome）"""
    print_colored("准备创建新脚本...", Colors.BLUE)
    
    # 提取脚本元数据
    metadata, content = extract_metadata(script_path)
    readme_content = extract_readme(readme_path, script_path)
    
    # 显示脚本信息
    print_colored("脚本信息:", Colors.BLUE)
    print(f"  名称: {Colors.YELLOW}{metadata['name']}{Colors.END}")
    print(f"  描述: {metadata['description']}")
    print(f"  版本: {Colors.YELLOW}{metadata['version']}{Colors.END}")
    print("")
    
    # 设置Chrome可执行文件路径
    if not chrome_path:
        # macOS上Chrome的默认路径
        chrome_path = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        if not os.path.exists(chrome_path):
            print_colored(f"警告: 未找到Chrome浏览器，将使用Playwright默认浏览器", Colors.YELLOW)
            chrome_path = None
    
    with sync_playwright() as p:
        # 启动Chrome浏览器
        print_colored("正在启动Chrome浏览器...", Colors.BLUE)
        
        try:
            if chrome_path:
                browser = p.chromium.launch(
                    executable_path=chrome_path,
                    headless=False,
                    channel="chrome"
                )
            else:
                browser = p.chromium.launch(headless=False)
            
            # 创建新的上下文和页面
            context = browser.new_context()
            page = context.new_page()
            
            # 先登录
            login_success = login_to_greasyfork(page, skip_login=skip_login)
            
            # 访问新建脚本页面
            print_colored("正在打开Greasy Fork新建脚本页面...", Colors.BLUE)
            page.goto("https://greasyfork.org/zh-CN/scripts/new")
            
            # 等待页面加载完成
            try:
                page.wait_for_selector("#script_name", state="visible", timeout=10000)
            except:
                print_colored("警告: 页面加载超时，尝试继续操作...", Colors.YELLOW)
            
            # 填写表单
            print_colored("正在填写表单...", Colors.BLUE)
            
            # 填写脚本名称和描述
            try:
                page.fill("#script_name", metadata["name"])
                page.fill("#script_description", metadata["description"])
                print_colored("已填写脚本名称和描述", Colors.GREEN)
            except Exception as e:
                print_colored(f"填写脚本名称和描述失败: {e}", Colors.RED)
            
            # 设置脚本类型
            try:
                page.check(f'input[name="script[script_type]"][value="{script_type}"]')
                print_colored(f"已设置脚本类型为: {script_type}", Colors.GREEN)
            except Exception as e:
                print_colored(f"设置脚本类型失败: {e}", Colors.RED)
            
            # 填写脚本代码
            try:
                page.fill("#script_code", content)
                print_colored("已填写脚本代码", Colors.GREEN)
            except Exception as e:
                print_colored(f"填写脚本代码失败: {e}", Colors.RED)
            
            # 填写附加信息（如果有README）
            if readme_content:
                try:
                    # 尝试找到正确的附加信息编辑框
                    additional_info_selector = page.query_selector("#script-version-additional-info-0")
                    if additional_info_selector:
                        page.fill("#script-version-additional-info-0", readme_content)
                        print_colored("已填写附加信息", Colors.GREEN)
                    else:
                        # 尝试使用更精确的选择器
                        additional_info_selector = page.query_selector('textarea[name="script_version[additional_info][0][attribute_value]"]')
                        if additional_info_selector:
                            page.fill('textarea[name="script_version[additional_info][0][attribute_value]"]', readme_content)
                            print_colored("已填写附加信息", Colors.GREEN)
                        else:
                            # 尝试旧的选择器作为后备
                            additional_info_selector = page.query_selector("#script_additional_info")
                            if additional_info_selector:
                                page.fill("#script_additional_info", readme_content)
                                print_colored("已使用旧选择器填写附加信息", Colors.GREEN)
                            else:
                                print_colored("警告: 所有尝试都未找到附加信息编辑框", Colors.YELLOW)
                except Exception as e:
                    print_colored(f"填写附加信息失败: {e}", Colors.RED)
            
            print_colored("\n表单已填写完成！", Colors.GREEN)
            print_colored("请手动检查表单内容并点击提交按钮。", Colors.YELLOW)
            print_colored("完成后请按Enter键关闭浏览器...", Colors.YELLOW)
            input()
            
        except Exception as e:
            print_colored(f"操作失败: {e}", Colors.RED)
        finally:
            # 关闭浏览器
            if 'browser' in locals():
                browser.close()

def update_last_script_id(script_id: str) -> None:
    """更新最后使用的脚本ID"""
    if not script_id:
        return
        
    config = load_config()
    config["last_script_id"] = script_id
    save_config(config)
    print_colored(f"已更新最后使用的脚本ID: {script_id}", Colors.GREEN)
    
def record_upload_history(script_path: str, script_id: str, operation_type: str, version: str = "", remarks: str = "") -> None:
    """记录上传历史
    
    Args:
        script_path: 脚本文件路径
        script_id: 脚本ID
        operation_type: 操作类型（新建/更新）
        version: 脚本版本
        remarks: 备注信息
    """
    if not os.path.exists(script_path):
        return
        
    # 获取脚本名称
    script_name = os.path.basename(script_path)
    script_name = os.path.splitext(script_name)[0]  # 移除扩展名
    
    # 如果没有提供版本号，尝试从脚本中提取
    if not version:
        version = extract_script_version(script_path)
    
    # 获取当前时间
    now = datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H:%M")
    
    # 准备新记录
    new_record = f"| {date_str} | {time_str} | {script_name} | {script_id} | {version} | {operation_type} | {remarks} |"
    
    # 检查历史记录文件是否存在
    if not os.path.exists(UPLOAD_HISTORY_FILE):
        # 创建新的历史记录文件
        with open(UPLOAD_HISTORY_FILE, 'w', encoding='utf-8') as f:
            f.write("# 脚本上传历史记录\n\n")
            f.write("此文件记录所有油猴脚本的上传历史，包括上传时间、脚本名称、版本号等信息。\n\n")
            f.write("## 上传记录\n\n")
            f.write("| 日期 | 时间 | 脚本名称 | 脚本ID | 版本 | 操作类型 | 备注 |\n")
            f.write("|------|------|---------|-------|------|---------|------|")  # 表头分隔行
    
    # 添加新记录
    with open(UPLOAD_HISTORY_FILE, 'r', encoding='utf-8') as f:
        content = f.readlines()
    
    # 找到表头分隔行的位置
    header_separator_index = -1
    for i, line in enumerate(content):
        if "|------" in line:
            header_separator_index = i
            break
    
    if header_separator_index >= 0:
        # 在表头分隔行后插入新记录
        content.insert(header_separator_index + 1, new_record + "\n")
        
        # 写回文件
        with open(UPLOAD_HISTORY_FILE, 'w', encoding='utf-8') as f:
            f.writelines(content)
            
        print_colored(f"已记录上传历史: {script_name} ({operation_type})", Colors.GREEN)

def extract_script_version(script_path: str) -> str:
    """从脚本文件中提取版本号"""
    try:
        with open(script_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
            # 尝试匹配 @version 标签
            version_match = re.search(r'@version\s+([\d\.]+)', content)
            if version_match:
                return version_match.group(1)
    except Exception as e:
        print_colored(f"提取版本号时出错: {e}", Colors.YELLOW)
    
    return ""  # 如果无法提取，返回空字符串

def get_last_script_id() -> str:
    """获取最后使用的脚本ID"""
    config = load_config()
    return config.get("last_script_id", "")

def find_readme(script_path):
    """根据脚本路径自动查找对应的README文件"""
    script_dir = os.path.dirname(os.path.abspath(script_path))
    possible_readmes = [
        os.path.join(script_dir, "README.md"),
        os.path.join(script_dir, "readme.md"),
        os.path.join(script_dir, "README.txt"),
    ]
    
    for path in possible_readmes:
        if os.path.exists(path):
            return path
    
    return None

def quick_update(script_path=None, skip_login=False):
    """快速更新模式，使用最后一次的脚本ID和默认设置"""
    if not script_path:
        # 如果没有提供脚本路径，尝试查找最近修改的油猴脚本
        print_colored("未提供脚本路径，尝试查找最近修改的油猴脚本...", Colors.BLUE)
        script_dirs = []
        
        # 查找油猴目录下的所有子目录
        for item in os.listdir(PROJECT_DIR):
            item_path = os.path.join(PROJECT_DIR, item)
            if os.path.isdir(item_path) and not item.startswith('.'):
                script_dirs.append(item_path)
        
        # 查找所有.js文件
        js_files = []
        for script_dir in script_dirs:
            for root, _, files in os.walk(script_dir):
                for file in files:
                    if file.endswith('.js'):
                        js_files.append(os.path.join(root, file))
        
        if not js_files:
            print_colored("错误: 未找到任何油猴脚本", Colors.RED)
            sys.exit(1)
        
        # 按修改时间排序
        js_files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
        script_path = js_files[0]
        print_colored(f"找到最近修改的脚本: {script_path}", Colors.GREEN)
    
    # 获取脚本ID
    last_id = get_last_script_id()
    if not last_id:
        print_colored("错误: 未找到上次使用的脚本ID", Colors.RED)
        print("请使用完整命令指定脚本ID: --update --id <ID>")
        sys.exit(1)
    
    # 查找README
    readme_path = find_readme(script_path)
    if readme_path:
        print_colored(f"找到README: {readme_path}", Colors.GREEN)
    else:
        print_colored("警告: 未找到README文件", Colors.YELLOW)
    
    # 执行更新
    success = update_script(last_id, script_path, readme_path, skip_login=skip_login)
    if success:
        # 记录上传历史
        version = extract_script_version(script_path)
        record_upload_history(script_path, last_id, "更新", version)
    
    return success

def main():
    """主函数"""
    # 检查是否有命令行参数
    if len(sys.argv) == 1:
        # 如果没有参数，进入快速更新模式
        print_colored("进入快速更新模式...", Colors.BLUE)
        quick_update(skip_login=False)  # 使用配置文件中的账号密码登录
        print_colored("操作完成！", Colors.GREEN)
        return
    
    # 解析命令行参数
    parser = argparse.ArgumentParser(description="Greasy Fork Chrome上传工具")
    parser.add_argument("script_path", nargs='?', help="油猴脚本文件路径")
    parser.add_argument("--new", action="store_true", help="创建新脚本（默认）")
    parser.add_argument("--update", action="store_true", help="更新现有脚本")
    parser.add_argument("--id", help="更新时的脚本ID，如果不提供则使用上次的ID")
    parser.add_argument("--type", choices=["public", "unlisted", "library"], default="public", help="脚本类型（仅新建时有效）")
    parser.add_argument("--readme", help="README文件路径，用于填写附加信息")
    parser.add_argument("--chrome", help="Chrome浏览器可执行文件路径")
    parser.add_argument("--username", help="Greasy Fork 用户名或邮箱")
    parser.add_argument("--password", help="Greasy Fork 密码")
    parser.add_argument("--skip-login", action="store_true", help="跳过登录步骤，使用现有浏览器会话")
    parser.add_argument("--save-config", action="store_true", help="安全保存凭据到配置文件")
    parser.add_argument("--quick", action="store_true", help="快速更新模式，使用最后一次的脚本ID和默认设置")
    
    global args
    args = parser.parse_args()
    
    # 快速更新模式
    if args.quick:
        quick_update(args.script_path)
        print_colored("操作完成！", Colors.GREEN)
        return
    
    # 检查脚本文件是否存在
    if args.script_path and not os.path.exists(args.script_path):
        print_colored(f"错误: 脚本文件 '{args.script_path}' 不存在", Colors.RED)
        sys.exit(1)
    
    # 确定操作类型
    is_update = args.update
    script_id = args.id
    
    # 如果没有提供脚本ID，但需要更新脚本，尝试使用上次的ID
    if is_update and not script_id:
        last_id = get_last_script_id()
        if last_id:
            script_id = last_id
            print_colored(f"使用上次的脚本ID: {script_id}", Colors.BLUE)
        else:
            print_colored("错误: 更新脚本时需要提供脚本ID", Colors.RED)
            print("请使用 --id 参数提供脚本ID")
            sys.exit(1)
    
    # 自动查找README文件（如果未指定）
    if not args.readme and args.script_path:
        auto_readme = find_readme(args.script_path)
        if auto_readme:
            args.readme = auto_readme
            print_colored(f"自动找到README文件: {auto_readme}", Colors.GREEN)
    
    # 获取更新说明
    update_notes = ""
    if args.readme:
        try:
            with open(args.readme, 'r', encoding='utf-8') as f:
                readme_content = f.read()
                # 尝试提取第一行作为更新说明
                first_line = readme_content.strip().split('\n')[0]
                update_notes = first_line.lstrip('#').strip()
        except Exception:
            pass
    
    # 执行操作
    if is_update:
        success = update_script(script_id, args.script_path, args.readme, args.chrome)
        if success:
            # 更新最后使用的脚本ID
            update_last_script_id(script_id)
            # 记录上传历史
            version = extract_script_version(args.script_path)
            record_upload_history(args.script_path, script_id, "更新", version, remarks=update_notes)
    else:
        new_script_id = create_new_script(args.script_path, args.readme, args.type, args.chrome)
        if new_script_id:
            # 更新最后使用的脚本ID
            update_last_script_id(new_script_id)
            # 记录上传历史
            version = extract_script_version(args.script_path)
            record_upload_history(args.script_path, new_script_id, "新建", version, remarks=update_notes)
    
    print_colored("操作完成！", Colors.GREEN)

if __name__ == "__main__":
    main()
