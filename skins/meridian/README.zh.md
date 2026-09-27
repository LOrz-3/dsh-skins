# 子午线 · DeepSeek-Meridian

DeepSeek 男性形象皮肤：可切换不同风格服饰，可切换为 Claude 与 GPT 配色。一套皮肤，一整个衣柜——安装在侧栏左下角换装与换配色，选择记忆在本机。

| ![子午线 · 亮色](preview/light.jpg) | ![子午线 · 暗色](preview/dark.jpg) |
|---|---|
| 亮色 | 暗色 |

## 服装 · 亮色

| 骑士 | 西装 | 盛夏 | 甜点师 | 主治 |
|---|---|---|---|---|
| ![骑士](assets/background-knight-light.jpg) | ![西装](assets/background-suit-light.jpg) | ![盛夏](assets/background-swim-light.jpg) | ![甜点师](assets/background-chef-light.jpg) | ![主治](assets/background-doctor-light.jpg) |

## 服装 · 暗色

| 骑士 | 西装 | 盛夏 | 甜点师 | 主治 |
|---|---|---|---|---|
| ![骑士](assets/background-knight-dark.jpg) | ![西装](assets/background-suit-dark.jpg) | ![盛夏](assets/background-swim-dark.jpg) | ![甜点师](assets/background-chef-dark.jpg) | ![主治](assets/background-doctor-dark.jpg) |

## 配色（亮色）

| 原色 | ClauMeridian | GPMeridian |
|---|---|---|
| ![原色](assets/background-knight-light.jpg) | ![ClauMeridian](assets/background-clau-light.jpg) | ![GPMeridian](assets/background-gp-light.jpg) |


## 换装面板

由 `hooks.mjs` 渲染，样式写在 `patches.css`（声明式、经过安全管线、强制作用域）。

- **服装 5 套**：骑士（默认）、西装、盛夏、甜点师、主治
- **配色 3 档**：原色、ClauMeridian（暖橙）、GPMeridian（银灰）

配色档附带**专属的骑士装插画**，因此换色是整幅图重新渲染而非滤镜叠加。也因为如此，配色为骑士装专属：**选配色会切回骑士，选其它服装会回到原色**。

## 换装是怎么实现的

- **服装**：`hooks.mjs` 改写宿主背景 `<img>` 的 `src`。宿主把皮肤背景画成一个带内联 full-bleed 样式的 `<img>` 加一个纱层 `<div>`，都挂在同一个装饰层里，且在 hooks 之前就绪。只改 `src`，宿主的纱层、背景不透明度、模糊与壁纸优先级全部原样保留。详情面板的竖版肖像由 `body[data-mw-art]` 驱动，纯 CSS。
- **配色**：`skin.css` 里按 `body[data-mw-palette]` 属性覆盖整套 `--dsw-*` 令牌，亮暗各一套。

**没有任何宿主 API 调用**——服装和配色都是皮肤内部状态，所以只要 hooks 被放行就能工作。

## 关于 hooks 的可用性

`hooks.mjs` 是 v2 契约里的**受信逃逸舱**，宿主只在两种情况下提供它：

| 安装方式 | hooks |
| --- | --- |
| 内置皮肤（`origin === 'builtin'`） | 提供 |
| 从市场安装（安装器写入 `dsh-market.provenance.json`） | 提供 |
| 手工把目录丢进 `~/.dsh/skins/`（无 provenance） | **不提供** |

手工安装时皮肤仍然正常显示（默认骑士装 · 原色），只是换装面板不出现，改为一行静态提示。

## 许可与声明

- 许可：CC BY-NC-SA 4.0
- 美术：为本皮肤原创生成的插画；原始参考图不随皮肤分发
- DeepSeek-Meridian 是非官方、非商业的社区角色设定，与 DeepSeek 无隶属、背书或赞助关系
