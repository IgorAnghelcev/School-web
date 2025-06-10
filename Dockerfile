FROM nginx:stable-alpine

# Заменяем главный конфиг
COPY nginx.conf /etc/nginx/nginx.conf

# Копируем всю папку с вашими *.html, *.css, *.js
COPY . /usr/share/nginx/html/

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]