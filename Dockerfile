# ===== 阶段一：构建 Vue 前端 =====
FROM node:22-alpine AS build
WORKDIR /app

# 先装依赖（利用 Docker 缓存层）
COPY package*.json ./
RUN npm install

# 再拷贝源码构建（.env.production 决定 API 地址）
COPY . .
RUN npm run build

# ===== 阶段二：Nginx 运行 =====
FROM nginx:1.25.5

# 拷贝构建产物与反向代理配置
COPY --from=build /app/dist /www/dist
COPY nginx_oa.conf /etc/nginx/conf.d/default.conf

# socket / 日志目录（与后端容器共享卷）
RUN mkdir -p /data/log /data/sock

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
