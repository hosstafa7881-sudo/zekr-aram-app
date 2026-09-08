import { CustomDhikrStage } from '../../lib/seedData';

export interface CustomStageDetail {
  stageNumber: number; // 1-based, for display
  stageName: string;
  stageCount: number;
  stageTarget: number;
  isComplete: boolean;
}

/** Generic version of TasbihatStageBar's stage-detection logic, for any number of user-defined stages. */
export function getCustomStageDetail(stages: CustomDhikrStage[], totalCount: number): CustomStageDetail {
  let cumulative = 0;
  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    const stageStart = cumulative;
    cumulative += stage.target;
    const isLastStage = i === stages.length - 1;
    if (totalCount < cumulative || isLastStage) {
      return {
        stageNumber: i + 1,
        stageName: stage.name,
        stageCount: Math.min(stage.target, Math.max(0, totalCount - stageStart)),
        stageTarget: stage.target,
        isComplete: totalCount >= cumulative,
      };
    }
  }
  return { stageNumber: 1, stageName: '', stageCount: 0, stageTarget: 0, isComplete: false };
}
