import { Request, Response, NextFunction } from 'express'
import { AppError } from './errorHandler'

const PLAN_ORDER = ['FREE', 'PRO', 'BUSINESS']

export function requirePlan(minimumPlan: 'FREE' | 'PRO' | 'BUSINESS') {
  return (req: Request, res: Response, next: NextFunction) => {
    const userPlan = req.user?.plan || 'FREE'
    const userIdx = PLAN_ORDER.indexOf(userPlan)
    const requiredIdx = PLAN_ORDER.indexOf(minimumPlan)
    if (userIdx < requiredIdx) {
      throw new AppError(402, `This feature requires the ${minimumPlan} plan or higher`, {
        code: 'PLAN_REQUIRED',
        required: minimumPlan,
        current: userPlan,
      })
    }
    next()
  }
}
