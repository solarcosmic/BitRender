<img width="1920" height="534" alt="bitrender_logo_banner" src="https://github.com/user-attachments/assets/8e925291-c582-4bca-ada3-5757343ef8ff" />

# BitRender

An API that lets you convert, store, delete, and retrieve images!

[Live Demo / Swagger API Docs](https://bitrender.solarcosmic.net/docs/)

## Setting up
To set up BitRender, you need these:
- MySQL/MariaDB database (phpMyAdmin is optional)
- NodeJS 22+ and a recent version of npm
- Git (optional)
- Server that is capable of running the above

This guide also requires familiarity with the above.

### Preparing and running the server
You can download the latest source code release from GitHub or clone the repository using Git (`git clone https://github.com/solarcosmic/BitRender.git`).

Once in the directory, you can run `npm i` to install the required dependencies and `node index.js` to run the server. However, you may get this:

<img width="497" height="150" alt="Screenshot 2025-08-17 143523" src="https://github.com/user-attachments/assets/90d53fe5-d919-4e3a-9d73-9f1201c9bf7f" />

This is because there is no SQL database for BitRender to use. Let's create one!
### Creating a SQL database
BitRender requires a SQL database to operate and store data. Make sure you have a database with these two tables:

```sql
CREATE TABLE images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  filename VARCHAR(255),
  format VARCHAR(10),
  data MEDIUMBLOB,
  author VARCHAR(255),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Then, ensure that you have the correct data entered into `settings.yml`. If hosting locally, it may look like this (for example):
```yml
database:
  host: "127.0.0.1"              # The host IP for the server, usually 127.0.0.1 if hosting locally (localhost).
  db_name: "bitrender"           # The name of the database to connect to.
  user: "root"                   # The username to login with for the database.
  password: ""                   # The password to login with for the database (only if required).
  port: 3306                     # The port used to connect to the database.
```
If all is successful, when you run `node index.js`, you should be able to use BitRender!

<img width="537" height="202" alt="Screenshot 2025-08-17 142836" src="https://github.com/user-attachments/assets/d89538f4-d0c3-4e97-b909-97cd1db7d4e2" />
