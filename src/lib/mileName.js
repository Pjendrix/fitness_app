// Název milníku pro UI: běžné podle id, „síla vůči sobě“ podle názvu cviku (lift:<key>)
import { t } from './i18n.js';
import { isLiftId } from './gamify.js';

export const mileName = (m) => (isLiftId(m.id) ? m.lift || t('mile.lift') : t('mile.' + m.id));
