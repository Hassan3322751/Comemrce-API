import dotenv from 'dotenv';
dotenv.config();

import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser'

import foodRouter from './routers/food.router.js';
import userRouter from './routers/user.router.js';
import orderRouter from './routers/order.router.js';
import uploadRouter from './routers/upload.router.js';

import { dbconnect } from './config/database.config.js';
import path, { dirname } from 'path';
dbconnect();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());
app.use(cookieParser())
app.use(
  cors({
    credentials: true,
    origin: [process.env.FRONTEND_URL],
  })
);

app.use('/api/foods', foodRouter);
app.use('/api/users', userRouter);
app.use('/api/orders', orderRouter);
app.use('/api/upload', uploadRouter);

const publicFolder = path.join(__dirname, 'public');
app.use(express.static(publicFolder));

app.get('/', (req, res) => {
  res.status(200).send('Api Working Fine')
})

app.get('*', (req, res) => {
  const indexFilePath = path.join(publicFolder, 'index.html');
  res.sendFile(indexFilePath);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log('listening on port ' + PORT);
});
