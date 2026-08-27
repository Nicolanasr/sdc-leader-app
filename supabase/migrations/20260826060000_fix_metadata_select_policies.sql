-- Migration: Allow authenticated users to SELECT roles, ranks, and responsibilities
-- Date: 2026-08-26
-- Author: Scouts des Cèdres Manager

-- Create SELECT policies for all authenticated users to read metadata configurations
CREATE POLICY "Anyone authenticated can view roles" ON public.roles 
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone authenticated can view ranks" ON public.ranks 
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone authenticated can view responsibilities" ON public.responsibilities 
    FOR SELECT USING (auth.uid() IS NOT NULL);
