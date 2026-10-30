'use client';
import DogChooser from '@/components/DogChooser';
import { FormAlert } from '@/components/ui/FormError';
import { Heading } from '@/components/ui/Heading';
import Button from '@/components/ui/Button';
import { loginUrl } from '@/lib/authFetch';

import type { Checkout } from './useCheckout';

/** Which of their dogs the plan is for (or add one). */
export function DogStep({ co }: { co: Checkout }) {
  const { t, router, error, errs, dogId, myDogs, setMyDogs, chooseDog, submitDog, actions, card } = co;
  return (
    <section className={card}>
      <Heading kind="form" as="h1" title={t(myDogs.length ? 'co.dog.which' : 'co.dog.title')} subtitle={t('co.dog.sub')} />
      <DogChooser dogs={myDogs} value={dogId} onChange={chooseDog} onDogsChange={setMyDogs} error={errs.dogName}
        onExpired={() => router.replace(loginUrl('/checkout'))} />
      <FormAlert message={error} className="mt-4" />
      {actions(<Button size="lg" icon="arrow" onClick={submitDog} label={t('co.continue').replace(/\s*→\s*$/, '')} />)}
    </section>
  );
}
