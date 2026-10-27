import { StatCard, StatCards, PlanHighlightCard } from '@/components/Toolbar';

/** Headline counts above the plan list, plus the two badge-holder highlights. */
export default function PlanStats({ plans, planOrderCounts }: { plans: any[]; planOrderCounts: Record<string, number> }) {
  return (
    <StatCards>
      <StatCard value={plans.length} label="total plans" theme="slate" />
      <StatCard value={plans.filter(p => p.isActive && p.listed !== false).length} label="live on site" theme="green" />
      <StatCard value={plans.filter(p => p.isActive && p.listed === false).length} label="hidden" theme="slate" />
      <StatCard value={plans.filter(p => !p.isActive).length} label="off" theme="red" />
      <StatCard value={Object.values(planOrderCounts).filter(c => c > 0).length} label="plans in use" theme="blue" />
      {(() => {
        const popular = plans.find(p => p.badge === 'Most Popular');
        const bestValue = plans.find(p => p.badge === 'Best Value');
        return (<>
          <PlanHighlightCard
            badge="popular"
            planName={popular?.name}
            sub={popular ? `${planOrderCounts[popular.id] ?? 0} orders · ₾${(Number(popular.price) / Number(popular.durationValue)).toFixed(2)}/mo` : undefined}
            empty="No orders yet"
          />
          <PlanHighlightCard
            badge="best_value"
            planName={bestValue?.name}
            sub={bestValue ? `${planOrderCounts[bestValue.id] ?? 0} orders · ₾${(Number(bestValue.price) / Number(bestValue.durationValue)).toFixed(2)}/mo` : undefined}
            empty="No multi-month plans"
          />
        </>);
      })()}
    </StatCards>
  );
}
