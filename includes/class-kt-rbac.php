<?php
if (!defined('ABSPATH')) {
    exit;
}

class KT_RBAC {

    private static $user_permissions_cache = array();

    public static function init() {
        // Initialization if needed
    }

    /**
     * Fetch user permissions record for current or given WP user
     */
    public static function get_user_permissions($user_id = null) {
        if (!$user_id) {
            $user_id = get_current_user_id();
        }

        if (!$user_id) {
            return false;
        }

        if (isset(self::$user_permissions_cache[$user_id])) {
            return self::$user_permissions_cache[$user_id];
        }

        global $wpdb;
        $table_permissions = $wpdb->prefix . 'kt_employee_permissions';
        $row = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table_permissions WHERE user_id = %d", $user_id), ARRAY_A);

        // Fallback for WP Administrator if no record exists yet
        if (!$row && user_can($user_id, 'administrator')) {
            $default_super_admin = array(
                'user_id'              => $user_id,
                'role_level'           => 'super_admin',
                'can_view_financials'  => 1,
                'can_create_invoice'   => 1,
                'can_collect_payment'  => 1,
                'can_edit_packages'    => 1,
                'can_manage_customers' => 1,
                'can_export_reports'   => 1,
                'approval_status'      => 'approved'
            );
            $wpdb->insert($table_permissions, $default_super_admin);
            $row = $default_super_admin;
        }

        self::$user_permissions_cache[$user_id] = $row;
        return $row;
    }

    /**
     * Key permission check helper: kt_current_user_can($permission_key)
     */
    public static function current_user_can($permission_key, $user_id = null) {
        $permissions = self::get_user_permissions($user_id);

        if (!$permissions || $permissions['approval_status'] !== 'approved') {
            return false;
        }

        // Super Admin has all privileges
        if ($permissions['role_level'] === 'super_admin') {
            return true;
        }

        if (isset($permissions[$permission_key])) {
            return (int)$permissions[$permission_key] === 1;
        }

        return false;
    }

    /**
     * Helper to mask financial attributes in customer or package arrays for non-financial staff
     */
    public static function filter_financial_data(&$data_array) {
        $can_view = self::current_user_can('can_view_financials');

        if (!$can_view) {
            if (isset($data_array['cost_price'])) {
                unset($data_array['cost_price']);
            }
            if (isset($data_array['margin'])) {
                unset($data_array['margin']);
            }
            if (isset($data_array['total_cost'])) {
                unset($data_array['total_cost']);
            }
            if (isset($data_array['net_profit'])) {
                unset($data_array['net_profit']);
            }
        }
    }
}

/**
 * Global helper function required by spec
 */
function kt_current_user_can($permission_key, $user_id = null) {
    return KT_RBAC::current_user_can($permission_key, $user_id);
}
