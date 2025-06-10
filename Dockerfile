FROM nginx:stable-alpine

# 1) Убираем дефолтный конфиг и дефолтную статику
RUN rm /etc/nginx/conf.d/default.conf \
 && rm -rf /usr/share/nginx/html/*

# 2) Копируем свой server-блок
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY html/ /usr/share/nginx/html/
COPY css/  /usr/share/nginx/html/css/
COPY js/   /usr/share/nginx/html/js/
COPY img/  /usr/share/nginx/html/img/

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
