# 飞书字段与单元格映射

来源为指南 2.1.2.2、2.1.2.3、附录4.1。这里的 fieldType 是同步连接器枚举，不能直接套用普通开放平台 Bitable API 的类型值。

| fieldType | 类型 | data 中的值 |
| --- | --- | --- |
| 1 | 多行文本 | string |
| 2 | 数字 | number |
| 3 | 单选 | string |
| 4 | 多选 | string[] |
| 5 | 日期 | Unix 毫秒时间戳（integer） |
| 6 | 条码 | string |
| 7 | 复选框 | boolean |
| 8 | 货币 | number |
| 9 | 电话 | 仅数字字符的 string |
| 10 | 超链接 | `{name: string, url: string}` |
| 11 | 进度 | number |
| 12 | 评分 | integer |
| 13 | 地理位置 | `{latitude: number, longitude: number}` |
| 14 | 人员 | `{ids: string[], idType: 'UserOpenID'或'UserUnionID'或'UserEmployeeID'}` |
| 15 | 附件 | `{ids: string[], idType: 'DriveFile'}`，ids 是已取得的附件 token |
| 16 | 群组 | `{ids: string[], idType: 'ChatOpenID'}` |

指南正文列出了人员、附件和群组的结构；页面评论中的历史支持范围不作为协议依据。只有验证相应 ID 来源、授权及宿主实际接受后，才声明具体项目支持该类型。不能将任意 URL 当作附件 token。

可作为 isPrimary=true 索引列的类型是 1、2、5、6、8、9、10。恰好一列设为 true，其余 false。记录唯一性来自 primaryID，不是索引列的显示值。

## property

指南只为数字、货币、进度、评分、日期提供 property。字段需要更细配置时，回到[附录4.1](https://feishu.feishu.cn/docx/GwBXdq7cmoZahfx8faQchcS2nXf#Aa6tduwo5ogv4sxGOCRciaOenAg)核对完整枚举。

- 数字 formatter 可用 `0`、`0.0`、`0.00`、`0.000`、`0.0000`、`#,##0`、`#,##0.00`、`0%`、`0.00%`；原文默认保留1位小数。模板显式使用 `0.00`。
- 日期 formatter 可用指南中的格式，例如 `yyyy/MM/dd`、`yyyy-MM-dd HH:mm`；记录值仍是毫秒时间戳，格式不改变时区/值的业务含义。
- 货币使用 formatter 和 currencyCode，例如 `{formatter:'#,##0.00',currencyCode:'CNY'}`；原文货币格式列表使用带千分位的格式，应以列表为准，避免盲抄其不一致的示例。
- 进度使用 formatter、min、max、color，例如 `{formatter:'0%',min:0,max:1,color:0}`。不要把0–1的比例与0–100数值混淆。
- 评分 max 范围1–10，默认5；记录评分应为在配置范围内的整数，越界可能无法显示。其他评分显示属性需按当前原文核对，不凭空补齐。

## 无损转换

JS number 不能安全表达所有 bigint/decimal。对订单号、大整数、精确金额先确定精度要求，必要时以文本保存，不能静默四舍五入。日期在源时区明确后转换到毫秒；缺失值/空值的具体接受方式需结合宿主验证，不把空值变成0或空字符串来掩盖类型问题。

fieldID 只能使用字母、数字、下划线，最长50；真实源字段名不合法时建立持久映射或用稳定 hash，不通过简单去除字符造成碰撞。primaryID 和 nextPageToken 也限制相同字符集、最长100。复合主键先规范编码再摘要；展示值可以保留原始业务键。
