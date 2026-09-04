import type { BilliardsQualityMode } from './adaptive-quality-v2.ts';
import type { BilliardsControllerSnapshotV2 } from './controller-v2.ts';
import { billiardsInteractionModes } from './interaction-state-v2.ts';
import type { BilliardsViewElements } from './view-elements.ts';
import { updateBilliardsView } from './view-state.ts';

export function updateBilliardsViewV2(
  view: BilliardsViewElements,
  snapshot: BilliardsControllerSnapshotV2,
  soundEnabled: boolean,
  quality: BilliardsQualityMode,
  portrait: boolean,
): void {
  updateBilliardsView(
    view,
    { ...snapshot, recentEvents: [] },
    soundEnabled,
  );
  const interaction = snapshot.interaction;
  view.root.dataset.interactionMode = interaction.mode;
  view.root.dataset.quality = quality;
  view.root.dataset.billiardsPortrait = String(portrait);
  view.root.dataset.billiardsBuild = 'controls-performance-v2';
  view.root.dataset.placementValid = String(
    interaction.placementPreview?.valid === true,
  );
  view.root.dataset.aimLocked = String(
    interaction.mode === billiardsInteractionModes.aimLocked
      || interaction.mode === billiardsInteractionModes.manualStroke,
  );
  view.root.dataset.manualStroke = String(
    interaction.mode === billiardsInteractionModes.manualStroke,
  );

  if (snapshot.match.ballInHand) {
    view.shoot.textContent = 'Поставить биток';
    view.shoot.disabled = interaction.placementPreview?.valid !== true;
    view.hint.textContent = interaction.placementPreview === null
      ? 'Выберите место для полупрозрачного битка'
      : interaction.placementPreview.valid
        ? 'Нажмите «Поставить биток», чтобы подтвердить позицию'
        : 'В этом месте биток поставить нельзя';
    return;
  }

  view.shoot.textContent = 'Удар';
  view.shoot.disabled = snapshot.match.activeShot !== null;
  if (interaction.mode === billiardsInteractionModes.aiming) {
    view.hint.textContent = 'Наведитесь и кликните по столу, чтобы зафиксировать прицел';
  } else if (interaction.mode === billiardsInteractionModes.aimLocked) {
    view.hint.textContent = 'Зажмите стол и проведите вдоль кия либо нажмите «Удар»';
  } else if (interaction.mode === billiardsInteractionModes.manualStroke) {
    view.hint.textContent = 'Отведите кий назад и резко проведите вперёд';
  }
}
