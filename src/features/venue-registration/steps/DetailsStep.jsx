import { useVenueDraftContext } from '../context/VenueDraftContext';
import { hasLegacyResortPricing, offeringKindOf } from '../offerings/model';
import CategoryPanel from './details/CategoryPanel';
import TimingsPanel from './details/TimingsPanel';
import CapacityPanel from './details/CapacityPanel';
import PricingPackagesPanel from './details/PricingPackagesPanel';
import ExtraPersonPanel from './details/ExtraPersonPanel';
import AmenitiesPanel from './details/AmenitiesPanel';
import PerSportPricingPanel from './details/PerSportPricingPanel';
import FullDescriptionPanel from './details/FullDescriptionPanel';
import AddOnsPanel from './details/AddOnsPanel';
import OffersPanel from './details/OffersPanel';
import FitnessPanel from './details/FitnessPanel';
import ResortPanel from './details/ResortPanel';
import SurprisePanel from './details/SurprisePanel';

const OFFERING_PANELS = { fitness: FitnessPanel, resort: ResortPanel, surprise: SurprisePanel };

/**
 * Step 4 · Details — category, capacity, pricing, amenities and add-ons.
 * The set of panels shown depends on the selected primary category.
 *
 * Fitness, Resort and Big Screen Surprise sell memberships, packages and
 * surprises instead of hourly slots, so they get their own form
 * (offerings/model.js) in place of the capacity / pricing / add-on panels.
 * A resort registered before packages existed keeps its hourly lawn
 * pricing panels too, so those venues stay editable and bookable.
 */
export default function DetailsStep() {
  const { draft } = useVenueDraftContext();
  const cat = draft.details.primaryCategory;
  const isPlayzone = cat === 'Playzone';
  const isResort = cat === 'Resort';
  const offering = offeringKindOf(cat);
  const OfferingPanel = OFFERING_PANELS[offering];

  if (OfferingPanel) {
    const legacy = isResort && hasLegacyResortPricing(draft.details);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <CategoryPanel />
        <TimingsPanel />
        <OfferingPanel />
        {legacy && <CapacityPanel />}
        {legacy && <PricingPackagesPanel />}
        {legacy && <OffersPanel />}
        <FullDescriptionPanel />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <CategoryPanel />
      {/* Every venue category has opening hours (events are not venues). */}
      <TimingsPanel />
      <CapacityPanel />
      {!isPlayzone && <PricingPackagesPanel />}
      {!isPlayzone && !isResort && <ExtraPersonPanel />}
      <AmenitiesPanel />
      {isPlayzone && <PerSportPricingPanel />}
      <FullDescriptionPanel />
      <AddOnsPanel />
      <OffersPanel />
    </div>
  );
}
