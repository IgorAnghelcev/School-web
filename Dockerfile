FROM nginx:stable-alpine

# Удаляем дефолтный конфиг и копируем свой
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Копируем всю папку с вашими *.html, *.css, *.js
COPY . /usr/share/nginx/html/

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]