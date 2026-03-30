import { Router } from 'express';

export const userRouter = Router();

userRouter.get('/', (_req, res) => {
	res.json({ data: [] });
});

userRouter.get('/:id', (req, res) => {
	res.json({ data: { id: req.params.id, name: 'Test User' } });
});
