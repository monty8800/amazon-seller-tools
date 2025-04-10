# 亚马逊卖家工具集 (Amazon Seller Tools)

这个仓库包含一系列为跨境电商卖家设计的效率工具，帮助卖家更好地管理和优化亚马逊店铺。

## 工具列表

### 亚马逊评论计算器 (Amazon Review Calculator)

这个油猴脚本可以帮助卖家精确计算各星级评价数量及提升评分所需的五星好评数。支持全球亚马逊站点，包括美国、英国、德国、法国、日本、加拿大等多个国家的亚马逊网站。

#### 主要功能

- 自动分析亚马逊产品页面的评论数据
- 计算当前加权平均评分
- 显示各星级评价的具体数量和百分比
- 计算达到目标评分所需的五星好评数量
- **新功能**: 支持自定义目标评分（1-5分），根据您的需求调整目标
- **新功能**: 支持折叠/展开结果面板，可以只显示重要信息
- 支持多语言界面（中文、英文、法语、德语、西班牙语、日语）
- 适配全球各大亚马逊站点

#### 安装方法

1. 安装油猴扩展 [Tampermonkey](https://www.tampermonkey.net/)
2. 点击 [这里](https://greasyfork.org/zh-CN/scripts/469048-%E4%BA%9A%E9%A9%AC%E9%80%8A%E8%AF%84%E8%AE%BA%E8%AE%A1%E7%AE%97%E4%BC%98%E5%8C%96%E7%89%88-enhanced-amazon-review-calculator?locale_override=1#) 安装脚本
3. 访问任意亚马逊产品页面，脚本将自动运行

## 更新日志

### 版本 3.8 (2025-04-07)
- 新增结果面板折叠/展开功能，可以只显示重要信息
- 添加用户偏好记忆功能，自动记住折叠/展开状态
- 优化界面布局，移除重复信息和多余分割线
- 修复修改目标分数后“需要的五星好评数”不更新的问题
- 增强输入验证，确保目标分数在有效范围内（1-5分）

### 版本 3.7 (2025-04-07)
- 使用 Tailwind CSS 全面美化用户界面
- 改进评分分布图表显示，使用现代化进度条
- 优化多语言支持，增加西班牙语支持
- 修复语言切换时的显示问题
- 改进错误提示的显示方式，增加图标和更清晰的错误信息
- 增强脚本稳定性，添加更多错误处理
- 优化数据提取算法，提高准确性

### 版本 3.5 (2025-04-03)
- 添加语言选择器，用户可以手动切换界面语言
- 改进界面布局，使用更现代的设计

### 版本 3.4 (2025-04-01)
- 新增自定义目标分数功能，用户可以根据需求设置1-5分之间的任意目标分数
- 修复了目标分数为5分时的计算逻辑
- 优化了界面显示

### 版本 3.3
- 改进了评论数据提取算法，提高了兼容性
- 优化了多语言支持

## 使用效果

### 现代化界面

新版本采用 Tailwind CSS 构建的现代化界面，具有以下特点：

- 美观的评分分布图表，直观展示各星级占比
- 清晰的数据展示，当前评分和所需好评数一目了然
- 便捷的语言切换功能，支持多种语言
- 响应式设计，适应不同屏幕大小

### 多语言支持

脚本现在支持以下语言：

- 中文
- 英语
- 法语
- 德语
- 西班牙语
- 日语

## 开发者

- Monty (@monty8800)

## 许可证

MIT