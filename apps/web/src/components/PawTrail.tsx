/** Paw prints that walk across an empty photo. */
export default function PawTrail({ className = '' }: { className?: string }) {
  const steps = [[18, 70, -20], [32, 55, 10], [46, 68, -15], [60, 52, 12], [74, 64, -10]];
  return (
    <span className={`absolute inset-0 pointer-events-none ${className}`} aria-hidden="true">
      {steps.map(([x, y, r], i) => (
        <span key={i} className="absolute text-[15px] opacity-0 animate-[pawStep_3.2s_ease-in-out_infinite]"
          style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 0.45}s`, ['--r' as any]: `${r}deg` }}>🐾</span>
      ))}
    </span>
  );
}
