# 并发、安全与浏览器指纹测试设计

## 变更边界

- `@richie696/react-framework-concurrency`：单 JavaScript runtime 的协作式异步锁。
- `@richie696/react-framework-security`：Web Crypto 摘要、ECDH/AES-GCM、HMAC 与 RSA-PSS 原语。
- `@richie696/react-framework-browser-fingerprint`：显式浏览器信号采集、签名载荷和 HTTP Header Provider。
- `@richie696/react-framework`：兼容导出及可选指纹 Provider 注入，不拥有浏览器采集实现。

## 风险到测试矩阵

| ID | 优先级 | 风险与行为 | 层级 | 自动化证据 |
| --- | --- | --- | --- | --- |
| CON-001 | P0 | 不同 owner 不能同时进入，可重入计数完整释放 | 单元 | `concurrency.test.mjs` 的 ReentrantLock 顺序断言 |
| CON-002 | P0 | 取消等待者后队列仍可推进 | 单元 | `LOCK_ABORTED` 与后继 owner 获取断言 |
| CON-003 | P0 | Condition 等待释放全部重入计数，唤醒或取消后恢复 | 单元 | signal/cancel 前后 owner/holdCount 断言 |
| CON-004 | P0 | 多读单写且已排队 writer 不被新 reader 饿死 | 单元 | reader/writer/late-reader 顺序断言 |
| CON-005 | P1 | 不支持的读锁升级明确失败 | 单元 | `LOCK_UPGRADE_UNSUPPORTED` 断言 |
| CON-006 | P0 | 写入使乐观读戳失效 | 单元 | write 前中后 `validate()` 断言 |
| SEC-001 | P0 | HMAC-SHA256 与标准向量一致且篡改失败 | 密码学契约 | 标准 Base64 签名与负向验签 |
| SEC-002 | P0 | RSA-PSS 导出/导入后可签名验签 | 密码学契约 | Node Web Crypto 2048-bit key pair |
| FPR-001 | P0 | 浏览器适配器生成哈希，SSR 不静默伪造指纹 | 单元 | 注入式 Canvas/WebGL fixture 与 `FingerprintUnavailableError` 断言 |
| FPR-002 | P0 | 每次载荷包含 timestamp/nonce 且 HMAC 可验 | 组件 | 确定性 collector/clock/random fixture |
| FPR-003 | P0 | 只有显式启用时 HTTP 才注入配置的指纹头 | 组件 | 捕获真实 `Request` Header |
| FPR-004 | P1 | 序列化、解析、哈希与相似度稳定 | 单元 | round-trip、SHA-256 长度和完全匹配 |

## 验证与开放边界

统一命令：`pnpm test`，先按 workspace 拓扑构建全部包，再运行 Node test runner。

当前自动化使用真实 Node Web Crypto，但没有宣称以下边界已通过：真实浏览器的
Canvas/WebGL 输出、反指纹模式、跨浏览器稳定性、后端时钟/nonce 防重放、服务端 HMAC/RSA
验签协议、跨 Worker/标签页/进程互斥。发布到具体产品前，应在目标浏览器和兼容后端上补充
集成验收，并使用合成数据；测试记录不得保留真实指纹或密钥。
