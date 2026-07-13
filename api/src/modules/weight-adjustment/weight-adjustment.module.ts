import { Module } from '@nestjs/common';
import { WeightAdjustmentService } from './weight-adjustment.service';

@Module({
  imports: [],
  controllers: [],
  providers: [WeightAdjustmentService],
  exports: [WeightAdjustmentService],
})
export class WeightAdjustmentModule {}
