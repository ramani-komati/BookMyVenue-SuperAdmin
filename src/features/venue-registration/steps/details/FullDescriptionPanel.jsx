import { Switch, TextField } from '@/reg-ui';
import { useVenueDraftContext } from '../../context/VenueDraftContext';
import useDetails from './useDetails';
import autoDescribe from './autoDescribe';

/**
 * Full description panel — either auto-generated from the entered info or
 * hand-written when the toggle is off.
 */
export default function FullDescriptionPanel() {
  const { draft } = useVenueDraftContext();
  const { details, set, toggleBool, flushNow } = useDetails();

  const auto = details.autoDescription;
  const value = auto ? autoDescribe(draft) : details.fullDescription || '';

  return (
    <div className="rv-panel">
      <div className="rv-panel-h">Full description</div>

      <div className="rv-toggle" style={{ marginBottom: 16 }}>
        <span>Auto-generate from the info above</span>
        <Switch checked={auto} onChange={() => toggleBool('autoDescription')} />
      </div>

      <TextField
        multiline
        rows={4}
        placeholder="Write a description of your venue..."
        value={value}
        disabled={auto}
        onChange={(e) => set('fullDescription', e.target.value)}
        onBlur={flushNow}
      />
    </div>
  );
}
