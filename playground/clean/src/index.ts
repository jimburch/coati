import express from 'express';
import { userRouter } from './routes/users.js';
import { healthRouter } from './routes/health.js';

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(express.json());
app.use('/api/users', userRouter);
app.use('/health', healthRouter);

app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
