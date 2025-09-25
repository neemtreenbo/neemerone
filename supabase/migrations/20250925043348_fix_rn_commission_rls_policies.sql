-- Fix RLS policies for RN Commission table
-- Description: Add missing UPDATE, DELETE policies and grant INSERT permissions
-- Author: Claude Code
-- Date: 2025-09-25

-- Add missing RLS policies for RN Commission Details (if not exists)
DO $$
BEGIN
    -- Try to create UPDATE policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'rn_commission_details'
        AND policyname = 'authenticated_users_with_app_role_can_update_rn_commission'
    ) THEN
        CREATE POLICY "authenticated_users_with_app_role_can_update_rn_commission"
        ON public.rn_commission_details FOR UPDATE
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.profiles
                WHERE profiles.user_id = auth.uid()
                AND profiles.app_role IN ('admin', 'manager')
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.profiles
                WHERE profiles.user_id = auth.uid()
                AND profiles.app_role IN ('admin', 'manager')
            )
        );
    END IF;

    -- Try to create DELETE policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'rn_commission_details'
        AND policyname = 'authenticated_users_with_app_role_can_delete_rn_commission'
    ) THEN
        CREATE POLICY "authenticated_users_with_app_role_can_delete_rn_commission"
        ON public.rn_commission_details FOR DELETE
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.profiles
                WHERE profiles.user_id = auth.uid()
                AND profiles.app_role IN ('admin', 'manager')
            )
        );
    END IF;
END $$;

-- Grant INSERT, UPDATE, DELETE permissions to authenticated users
GRANT INSERT, UPDATE, DELETE ON public.rn_commission_details TO authenticated;