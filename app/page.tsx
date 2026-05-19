import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { LandingPage } from '@/components/LandingPage'

export default async function RootPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_complete')
      .eq('id', user.id)
      .single()
    if (!profile?.onboarding_complete) redirect('/onboarding')
    redirect('/home')
  }

  return <LandingPage />
}
