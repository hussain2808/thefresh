import { Injectable } from '@nestjs/common';
import { adjustLine, AdjustLineInput, AdjustLineResult } from './weight-adjustment.util';

/**
 * The Weight Adjustment Engine. Stays independent per docs/architecture.md:
 * no Prisma, no DB access, no side effects — orders fetches the data,
 * calls adjustLines(), and persists the result itself.
 */
@Injectable()
export class WeightAdjustmentService {
  adjustLines(inputs: AdjustLineInput[]): AdjustLineResult[] {
    return inputs.map(adjustLine);
  }
}
