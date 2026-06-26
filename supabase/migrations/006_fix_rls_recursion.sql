-- Fix infinite recursion in RLS policies (#44, error 42P17).
--
-- Every admin check was `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()
-- AND role = 'admin')`. On the *profiles* table's own policies that self-
-- references → infinite recursion, and since other tables' policies also read
-- profiles, any RLS-evaluated read errored.
--
-- Fix: a SECURITY DEFINER helper that reads profiles with RLS bypassed (so it
-- can't re-trigger the profiles policy), and replace every recursive subquery
-- with it. Idempotent.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
$$;

-- profiles (the recursion source)
DROP POLICY IF EXISTS profiles_own_select ON profiles;
CREATE POLICY profiles_own_select ON profiles FOR SELECT USING (id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS profiles_admin ON profiles;
CREATE POLICY profiles_admin ON profiles FOR ALL USING (public.is_admin());

-- quiz_sessions / quiz_answers (preserve the owner-access branches)
DROP POLICY IF EXISTS qs_own_select ON quiz_sessions;
CREATE POLICY qs_own_select ON quiz_sessions FOR SELECT USING (
  user_id = auth.uid() OR user_id IS NULL OR public.is_admin()
);
DROP POLICY IF EXISTS qa_select ON quiz_answers;
CREATE POLICY qa_select ON quiz_answers FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM quiz_sessions qs
    WHERE qs.id = quiz_answers.session_id
      AND (qs.user_id = auth.uid() OR qs.user_id IS NULL)
  ) OR public.is_admin()
);

-- Reference / content tables (admin write)
DROP POLICY IF EXISTS birds_admin ON birds;
CREATE POLICY birds_admin ON birds FOR ALL USING (public.is_admin());
DROP POLICY IF EXISTS sg_admin ON similarity_groups;
CREATE POLICY sg_admin ON similarity_groups FOR ALL USING (public.is_admin());
DROP POLICY IF EXISTS bsg_admin ON bird_similarity_group;
CREATE POLICY bsg_admin ON bird_similarity_group FOR ALL USING (public.is_admin());
DROP POLICY IF EXISTS bi_admin ON bird_images;
CREATE POLICY bi_admin ON bird_images FOR ALL USING (public.is_admin());
DROP POLICY IF EXISTS bds_admin ON bird_difficulty_stats;
CREATE POLICY bds_admin ON bird_difficulty_stats FOR ALL USING (public.is_admin());
DROP POLICY IF EXISTS do_admin ON distractor_overrides;
CREATE POLICY do_admin ON distractor_overrides FOR ALL USING (public.is_admin());

-- Sensitive tables (admin only)
DROP POLICY IF EXISTS audit_admin ON audit_log;
CREATE POLICY audit_admin ON audit_log FOR SELECT USING (public.is_admin());
DROP POLICY IF EXISTS audit_insert ON audit_log;
CREATE POLICY audit_insert ON audit_log FOR INSERT WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS sub_admin ON subscriptions;
CREATE POLICY sub_admin ON subscriptions FOR ALL USING (public.is_admin());
DROP POLICY IF EXISTS pe_admin ON payment_events;
CREATE POLICY pe_admin ON payment_events FOR ALL USING (public.is_admin());
