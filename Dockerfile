FROM nginx:1.25.5

# 将当前项目代码拷贝到/www下
COPY . /www/

RUN mkdir -p /data/sock

WORKDIR /www

RUN cp /www/nginx_oa.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

ENTRYPOINT nginx -g "daemon off;"