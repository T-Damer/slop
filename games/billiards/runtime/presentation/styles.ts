import { billiardsAtmosphereStyles } from './atmosphere-styles.ts';
import { billiardsBaseStyles } from './base-styles.ts';
import { billiardsControlStyles } from './control-styles.ts';
import { billiardsResponsiveStyles } from './responsive-styles.ts';
import { billiardsScoreboardStyles } from './scoreboard-styles.ts';
import { billiardsStageStyles } from './stage-styles.ts';

export const billiardsStyles = [
  billiardsBaseStyles,
  billiardsScoreboardStyles,
  billiardsStageStyles,
  billiardsControlStyles,
  billiardsAtmosphereStyles,
  billiardsResponsiveStyles,
].join('\n');
