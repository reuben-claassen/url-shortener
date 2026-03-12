import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error(err);

  if (err instanceof AppError) {
    const response: ApiResponse<null> = { success: false, error: err.message };
    res.status(err.statusCode).json(response);
    return;
  }

  const response: ApiResponse<null> = {
    success: false,
    error: 'An unexpected error occurred',
  };
  res.status(500).json(response);
};

export const notFound = (_req: Request, res: Response): void => {
  const response: ApiResponse<null> = { success: false, error: 'Route not found' };
  res.status(404).json(response);
};
