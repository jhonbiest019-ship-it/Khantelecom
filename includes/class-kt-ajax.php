<?php
if (!defined('ABSPATH')) {
    exit;
}

class KT_AJAX {

    public static function init() {
        // Public / Nopriv actions (Login)
        add_action('wp_ajax_nopriv_kt_login', array(__CLASS__, 'ajax_login'));
        add_action('wp_ajax_kt_login', array(__CLASS__, 'ajax_login'));

        // Authenticated & Public AJAX Actions
        add_action('wp_ajax_nopriv_kt_register_staff_request', array(__CLASS__, 'kt_register_staff_request'));
        add_action('wp_ajax_kt_register_staff_request', array(__CLASS__, 'kt_register_staff_request'));

        $actions = array(
            'kt_logout',
            'kt_get_dashboard_stats',
            'kt_get_customers',
            'kt_save_customer',
            'kt_delete_customer',
            'kt_get_packages',
            'kt_save_package',
            'kt_get_invoices',
            'kt_create_invoice',
            'kt_delete_invoice',
            'kt_toggle_invoice_status',
            'kt_collect_payment',
            'kt_get_receipt_data',
            'kt_get_employee_matrix',
            'kt_save_employee_permission',
            'kt_get_activity_logs',
            'kt_get_customer_history',
            'kt_get_products',
            'kt_save_product',
            'kt_delete_product',
            'kt_sell_product',
            'kt_change_superadmin_password'
        );

        foreach ($actions as $action) {
            add_action('wp_ajax_' . $action, array(__CLASS__, $action));
        }
    }

    private static function verify_request($permission_key = null) {
        check_ajax_referer('kt_app_nonce', 'nonce');

        if (!is_user_logged_in()) {
            wp_send_json_error(array('message' => 'Session expired. Please login again.'), 401);
        }

        if ($permission_key && !kt_current_user_can($permission_key)) {
            wp_send_json_error(array('message' => 'Access Denied: Insufficient permissions for this action.'), 403);
        }
    }

    /**
     * AJAX Standalone Portal Login
     */
    public static function ajax_login() {
        check_ajax_referer('kt_app_nonce', 'nonce');

        $username = isset($_POST['log']) ? sanitize_text_field(wp_unslash($_POST['log'])) : '';
        $password = isset($_POST['pwd']) ? $_POST['pwd'] : '';
        $remember = isset($_POST['rememberme']) && $_POST['rememberme'] === 'forever';

        if (empty($username) || empty($password)) {
            wp_send_json_error(array('message' => 'Please enter username and password.'));
        }

        $creds = array(
            'user_login'    => $username,
            'user_password' => $password,
            'remember'      => $remember,
        );

        $user = wp_signon($creds, is_ssl());

        if (is_wp_error($user)) {
            wp_send_json_error(array('message' => $user->get_error_message()));
        }

        // Verify if employee is approved
        $permissions = KT_RBAC::get_user_permissions($user->ID);
        if ($permissions && $permissions['approval_status'] === 'pending_approval') {
            wp_logout();
            wp_send_json_error(array('message' => 'Your staff account is pending Super Admin approval.'));
        } elseif ($permissions && $permissions['approval_status'] === 'revoked') {
            wp_logout();
            wp_send_json_error(array('message' => 'Your account access has been revoked. Contact Administrator.'));
        }

        wp_send_json_success(array('message' => 'Login successful! Redirecting...', 'redirect' => home_url('/' . KT_PAGE_SLUG)));
    }

    /**
     * AJAX Logout
     */
    public static function kt_logout() {
        self::verify_request();
        wp_logout();
        wp_send_json_success(array('message' => 'Logged out successfully.'));
    }

    /**
     * Dashboard Statistics Polling Engine
     */
    public static function kt_get_dashboard_stats() {
        self::verify_request();
        global $wpdb;

        $table_customers = $wpdb->prefix . 'kt_customers';
        $table_invoices  = $wpdb->prefix . 'kt_invoices';
        $table_packages  = $wpdb->prefix . 'kt_packages';
        $table_sales     = $wpdb->prefix . 'kt_product_sales';

        // Customer Counts
        $total_customers = (int)$wpdb->get_var("SELECT COUNT(*) FROM $table_customers");
        $active_cust     = (int)$wpdb->get_var("SELECT COUNT(*) FROM $table_customers WHERE status='active'");
        $suspended_cust  = (int)$wpdb->get_var("SELECT COUNT(*) FROM $table_customers WHERE status='suspended'");
        $pending_cust    = (int)$wpdb->get_var("SELECT COUNT(*) FROM $table_customers WHERE status='pending'");

        // Today's Collection (Fee Recovery + Product Sales)
        $today_start = date('Y-m-d 00:00:00');
        $today_end   = date('Y-m-d 23:59:59');
        $today_inv_collected = (float)$wpdb->get_var($wpdb->prepare(
            "SELECT SUM(amount_paid) FROM $table_invoices WHERE payment_status='paid' AND paid_at BETWEEN %s AND %s",
            $today_start, $today_end
        ));
        $today_sales_collected = (float)$wpdb->get_var($wpdb->prepare(
            "SELECT SUM(total_sale) FROM $table_sales WHERE created_at BETWEEN %s AND %s",
            $today_start, $today_end
        ));
        $today_collected = $today_inv_collected + $today_sales_collected;

        // Monthly Total Revenue
        $current_month = date('Y-m');
        $monthly_inv_revenue = (float)$wpdb->get_var($wpdb->prepare(
            "SELECT SUM(amount_paid) FROM $table_invoices WHERE payment_status='paid' AND billing_month = %s",
            $current_month
        ));
        $monthly_sales_revenue = (float)$wpdb->get_var($wpdb->prepare(
            "SELECT SUM(total_sale) FROM $table_sales WHERE DATE_FORMAT(created_at, '%%Y-%%m') = %s",
            $current_month
        ));
        $monthly_revenue = $monthly_inv_revenue + $monthly_sales_revenue;

        // Total Pending Dues
        $pending_dues = (float)$wpdb->get_var("SELECT SUM(amount_due - amount_paid) FROM $table_invoices WHERE payment_status != 'paid'");

        // Upstream Cost & Profit Calculation (Super Admin / Admin with can_view_financials)
        $financials = array(
            'can_view'     => kt_current_user_can('can_view_financials'),
            'total_cost'   => 0.00,
            'total_profit' => 0.00,
        );

        if ($financials['can_view']) {
            $cost_query = "SELECT SUM(p.cost_price) FROM $table_customers c JOIN $table_packages p ON c.package_id = p.id WHERE c.status='active'";
            $total_cost = (float)$wpdb->get_var($cost_query);
            $monthly_sales_profit = (float)$wpdb->get_var($wpdb->prepare(
                "SELECT SUM(profit) FROM $table_sales WHERE DATE_FORMAT(created_at, '%%Y-%%m') = %s",
                $current_month
            ));
            $financials['total_cost']   = $total_cost;
            $financials['total_profit'] = max(0, ($monthly_inv_revenue - $total_cost) + $monthly_sales_profit);
        }

        // Recent Activity Feed (Combined Invoice Settlements & Hardware Sales)
        $recent_collections = $wpdb->get_results(
            "SELECT i.invoice_number, c.full_name, c.customer_code, i.amount_paid, i.payment_method, i.paid_at as date_time 
             FROM $table_invoices i 
             JOIN $table_customers c ON i.customer_id = c.id 
             WHERE i.payment_status='paid' ORDER BY i.paid_at DESC LIMIT 5",
            ARRAY_A
        );

        wp_send_json_success(array(
            'total_customers'   => $total_customers,
            'active_customers'  => $active_cust,
            'suspended_cust'    => $suspended_cust,
            'pending_cust'      => $pending_cust,
            'today_collected'   => number_format($today_collected, 2),
            'monthly_revenue'   => number_format($monthly_revenue, 2),
            'pending_dues'      => number_format($pending_dues, 2),
            'financials'        => $financials,
            'recent_collections'=> $recent_collections,
            'timestamp'         => date('h:i:s A')
        ));
    }

    /**
     * Get Customers List
     */
    public static function kt_get_customers() {
        self::verify_request('can_manage_customers');
        global $wpdb;

        $table_customers = $wpdb->prefix . 'kt_customers';
        $table_packages  = $wpdb->prefix . 'kt_packages';

        $search = isset($_POST['search']) ? sanitize_text_field(wp_unslash($_POST['search'])) : '';
        $status = isset($_POST['status']) ? sanitize_text_field(wp_unslash($_POST['status'])) : '';

        $where = "WHERE 1=1";
        if (!empty($search)) {
            $where .= $wpdb->prepare(" AND (c.full_name LIKE %s OR c.customer_code LIKE %s OR c.phone_number LIKE %s OR c.area_sector LIKE %s)", 
                '%' . $wpdb->esc_like($search) . '%',
                '%' . $wpdb->esc_like($search) . '%',
                '%' . $wpdb->esc_like($search) . '%',
                '%' . $wpdb->esc_like($search) . '%'
            );
        }
        if (!empty($status)) {
            $where .= $wpdb->prepare(" AND c.status = %s", $status);
        }

        $customers = $wpdb->get_results(
            "SELECT c.*, p.package_name, p.speed_mbps, p.sale_price 
             FROM $table_customers c 
             LEFT JOIN $table_packages p ON c.package_id = p.id 
             $where ORDER BY c.id DESC",
            ARRAY_A
        );

        wp_send_json_success(array('customers' => $customers));
    }

    /**
     * Save / Update Customer
     */
    public static function kt_save_customer() {
        self::verify_request('can_manage_customers');
        global $wpdb;

        $table_customers = $wpdb->prefix . 'kt_customers';
        $id = isset($_POST['id']) ? (int)$_POST['id'] : 0;

        $data = array(
            'full_name'        => sanitize_text_field(wp_unslash($_POST['full_name'])),
            'phone_number'     => sanitize_text_field(wp_unslash($_POST['phone_number'])),
            'cnic_id'          => sanitize_text_field(wp_unslash($_POST['cnic_id'])),
            'address'          => sanitize_textarea_field(wp_unslash($_POST['address'])),
            'area_sector'      => sanitize_text_field(wp_unslash($_POST['area_sector'])),
            'package_id'       => (int)$_POST['package_id'],
            'assigned_ip_ipoe' => sanitize_text_field(wp_unslash($_POST['assigned_ip_ipoe'])),
            'connection_type'  => sanitize_text_field(wp_unslash($_POST['connection_type'])),
            'billing_cycle_day'=> (int)$_POST['billing_cycle_day'],
            'status'           => sanitize_text_field(wp_unslash($_POST['status'])),
        );

        if ($id > 0) {
            $wpdb->update($table_customers, $data, array('id' => $id));
            wp_send_json_success(array('message' => 'Customer profile updated successfully!'));
        } else {
            $data['customer_code'] = KT_DB::generate_customer_code();
            $data['created_at']    = date('Y-m-d H:i:s');
            $wpdb->insert($table_customers, $data);
            wp_send_json_success(array('message' => 'New customer registered successfully with Code: ' . $data['customer_code']));
        }
    }

    /**
     * Get Packages List
     */
    public static function kt_get_packages() {
        self::verify_request();
        global $wpdb;

        $table_packages = $wpdb->prefix . 'kt_packages';
        $packages = $wpdb->get_results("SELECT * FROM $table_packages ORDER BY speed_mbps ASC", ARRAY_A);

        $can_view_financials = kt_current_user_can('can_view_financials');

        foreach ($packages as &$pkg) {
            if (!$can_view_financials) {
                unset($pkg['cost_price']);
                unset($pkg['margin']);
            }
        }

        wp_send_json_success(array('packages' => $packages, 'can_edit' => kt_current_user_can('can_edit_packages')));
    }

    /**
     * Save / Update Package
     */
    public static function kt_save_package() {
        self::verify_request('can_edit_packages');
        global $wpdb;

        $table_packages = $wpdb->prefix . 'kt_packages';
        $id = isset($_POST['id']) ? (int)$_POST['id'] : 0;

        $cost_price = floatval($_POST['cost_price']);
        $sale_price = floatval($_POST['sale_price']);
        $margin     = max(0, $sale_price - $cost_price);

        $data = array(
            'package_name' => sanitize_text_field(wp_unslash($_POST['package_name'])),
            'speed_mbps'   => (int)$_POST['speed_mbps'],
            'cost_price'   => $cost_price,
            'sale_price'   => $sale_price,
            'margin'       => $margin,
            'status'       => sanitize_text_field(wp_unslash($_POST['status'])),
        );

        if ($id > 0) {
            $wpdb->update($table_packages, $data, array('id' => $id));
            wp_send_json_success(array('message' => 'Package updated successfully!'));
        } else {
            $wpdb->insert($table_packages, $data);
            wp_send_json_success(array('message' => 'New ISP package created successfully!'));
        }
    }

    /**
     * Get Invoices List
     */
    public static function kt_get_invoices() {
        self::verify_request();
        global $wpdb;

        $table_invoices  = $wpdb->prefix . 'kt_invoices';
        $table_customers = $wpdb->prefix . 'kt_customers';
        $table_packages  = $wpdb->prefix . 'kt_packages';

        $status = isset($_POST['status']) ? sanitize_text_field(wp_unslash($_POST['status'])) : '';
        $search = isset($_POST['search']) ? sanitize_text_field(wp_unslash($_POST['search'])) : '';

        $where = "WHERE 1=1";
        if (!empty($status)) {
            $where .= $wpdb->prepare(" AND i.payment_status = %s", $status);
        }
        if (!empty($search)) {
            $where .= $wpdb->prepare(" AND (c.full_name LIKE %s OR c.customer_code LIKE %s OR i.invoice_number LIKE %s)",
                '%' . $wpdb->esc_like($search) . '%',
                '%' . $wpdb->esc_like($search) . '%',
                '%' . $wpdb->esc_like($search) . '%'
            );
        }

        $invoices = $wpdb->get_results(
            "SELECT i.*, c.full_name, c.customer_code, c.phone_number, c.area_sector, p.package_name, p.speed_mbps 
             FROM $table_invoices i 
             JOIN $table_customers c ON i.customer_id = c.id 
             LEFT JOIN $table_packages p ON c.package_id = p.id 
             $where ORDER BY i.id DESC",
            ARRAY_A
        );

        wp_send_json_success(array('invoices' => $invoices));
    }

    /**
     * Create Invoice
     */
    public static function kt_create_invoice() {
        self::verify_request('can_create_invoice');
        global $wpdb;

        $table_invoices  = $wpdb->prefix . 'kt_invoices';
        $table_customers = $wpdb->prefix . 'kt_customers';
        $table_packages  = $wpdb->prefix . 'kt_packages';

        $customer_id   = (int)$_POST['customer_id'];
        $billing_month = sanitize_text_field(wp_unslash($_POST['billing_month'])); // e.g. 2026-09

        $customer = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table_customers WHERE id = %d", $customer_id), ARRAY_A);
        if (!$customer) {
            wp_send_json_error(array('message' => 'Invalid customer ID selected.'));
        }

        $package = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table_packages WHERE id = %d", $customer['package_id']), ARRAY_A);
        $amount_due = $package ? (float)$package['sale_price'] : 0.00;

        $invoice_number = KT_DB::generate_invoice_number();

        $data = array(
            'invoice_number' => $invoice_number,
            'customer_id'    => $customer_id,
            'amount_due'     => $amount_due,
            'amount_paid'    => 0.00,
            'discount'       => 0.00,
            'billing_month'  => $billing_month,
            'payment_status' => 'unpaid',
            'created_at'     => date('Y-m-d H:i:s')
        );

        $wpdb->insert($table_invoices, $data);
        wp_send_json_success(array('message' => 'Invoice ' . $invoice_number . ' generated successfully!'));
    }

    /**
     * Collect Fee / Mark Paid
     */
    public static function kt_collect_payment() {
        self::verify_request('can_collect_payment');
        global $wpdb;

        $table_invoices = $wpdb->prefix . 'kt_invoices';
        $invoice_id     = (int)$_POST['invoice_id'];
        $amount_paid    = floatval($_POST['amount_paid']);
        $discount       = floatval($_POST['discount']);
        $payment_method = sanitize_text_field(wp_unslash($_POST['payment_method']));

        $invoice = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table_invoices WHERE id = %d", $invoice_id), ARRAY_A);
        if (!$invoice) {
            wp_send_json_error(array('message' => 'Invoice not found.'));
        }

        $net_due = max(0, (float)$invoice['amount_due'] - $discount);
        $status  = ($amount_paid >= $net_due) ? 'paid' : 'partial';

        $data = array(
            'amount_paid'          => $amount_paid,
            'discount'             => $discount,
            'payment_status'       => $status,
            'payment_method'       => $payment_method,
            'collected_by_user_id' => get_current_user_id(),
            'paid_at'              => date('Y-m-d H:i:s'),
        );

        $wpdb->update($table_invoices, $data, array('id' => $invoice_id));

        wp_send_json_success(array(
            'message'    => 'Payment of PKR ' . number_format($amount_paid, 2) . ' recorded successfully!',
            'invoice_id' => $invoice_id
        ));
    }

    /**
     * Get Receipt Data & WhatsApp link (Supports Invoice & Product Sales)
     */
    public static function kt_get_receipt_data() {
        self::verify_request();
        global $wpdb;

        $receipt_type = isset($_POST['receipt_type']) ? sanitize_text_field(wp_unslash($_POST['receipt_type'])) : 'invoice';
        $table_customers = $wpdb->prefix . 'kt_customers';

        if ($receipt_type === 'sale') {
            $sale_id     = isset($_POST['sale_id']) ? (int)$_POST['sale_id'] : (int)$_POST['invoice_id'];
            $table_sales = $wpdb->prefix . 'kt_product_sales';
            $table_prods = $wpdb->prefix . 'kt_products';

            $sale = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table_sales WHERE id = %d", $sale_id), ARRAY_A);
            if (!$sale) {
                wp_send_json_error(array('message' => 'Hardware sale record not found.'));
            }

            $customer = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table_customers WHERE id = %d", $sale['customer_id']), ARRAY_A);
            $product  = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table_prods WHERE id = %d", $sale['product_id']), ARRAY_A);

            $sold_by = 'Staff';
            if (!empty($sale['sold_by_user_id'])) {
                $user_info = get_userdata($sale['sold_by_user_id']);
                if ($user_info) {
                    $sold_by = $user_info->display_name;
                }
            }

            $thermal_html = KT_Receipt_Engine::render_product_sale_thermal_slip_html($sale, $customer, $product, $sold_by);
            $wa_message   = KT_Receipt_Engine::generate_product_sale_whatsapp_message($sale, $customer, $product, $sold_by);
            $wa_link      = KT_Receipt_Engine::generate_whatsapp_url($customer['phone_number'], $wa_message);

            wp_send_json_success(array(
                'thermal_html' => $thermal_html,
                'whatsapp_link'=> $wa_link,
                'whatsapp_msg' => $wa_message
            ));
            return;
        }

        // Default: Invoice / Fee Collection Receipt
        $invoice_id     = (int)$_POST['invoice_id'];
        $table_invoices  = $wpdb->prefix . 'kt_invoices';
        $table_packages  = $wpdb->prefix . 'kt_packages';

        $invoice = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table_invoices WHERE id = %d", $invoice_id), ARRAY_A);
        if (!$invoice) {
            wp_send_json_error(array('message' => 'Invoice not found.'));
        }

        $customer = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table_customers WHERE id = %d", $invoice['customer_id']), ARRAY_A);
        $package  = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table_packages WHERE id = %d", $customer['package_id']), ARRAY_A);

        $collector_name = 'Staff';
        if (!empty($invoice['collected_by_user_id'])) {
            $user_info = get_userdata($invoice['collected_by_user_id']);
            if ($user_info) {
                $collector_name = $user_info->display_name;
            }
        }

        $thermal_html  = KT_Receipt_Engine::render_thermal_slip_html($invoice, $customer, $package, $collector_name);
        $wa_message    = KT_Receipt_Engine::generate_whatsapp_message($invoice, $customer, $package, $collector_name);
        $wa_link       = KT_Receipt_Engine::generate_whatsapp_url($customer['phone_number'], $wa_message);

        wp_send_json_success(array(
            'thermal_html' => $thermal_html,
            'whatsapp_link'=> $wa_link,
            'whatsapp_msg' => $wa_message
        ));
    }

    /**
     * Get Employee Matrix
     */
    public static function kt_get_employee_matrix() {
        self::verify_request();
        if (get_current_user_id() && !kt_current_user_can('can_export_reports') && !user_can(get_current_user_id(), 'administrator')) {
            wp_send_json_error(array('message' => 'Only Super Admin can manage staff permissions.'), 403);
        }

        global $wpdb;
        $table_permissions = $wpdb->prefix . 'kt_employee_permissions';

        $users = get_users(array('fields' => array('ID', 'user_login', 'display_name', 'user_email')));
        $matrix = array();

        foreach ($users as $u) {
            $perm = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table_permissions WHERE user_id = %d", $u->ID), ARRAY_A);
            if (!$perm) {
                $perm = array(
                    'role_level'           => 'employee',
                    'can_view_financials'  => 0,
                    'can_create_invoice'   => 1,
                    'can_collect_payment'  => 1,
                    'can_edit_packages'    => 0,
                    'can_manage_customers' => 1,
                    'can_export_reports'   => 0,
                    'approval_status'      => 'pending_approval'
                );
            }
            $matrix[] = array(
                'user_id'      => $u->ID,
                'user_login'   => $u->user_login,
                'display_name' => $u->display_name,
                'user_email'   => $u->user_email,
                'permissions'  => $perm
            );
        }

        wp_send_json_success(array('matrix' => $matrix));
    }

    /**
     * Save Staff Permissions
     */
    public static function kt_save_employee_permission() {
        self::verify_request();
        if (!user_can(get_current_user_id(), 'administrator')) {
            wp_send_json_error(array('message' => 'Only WordPress Administrators / Super Admins can alter staff permissions.'), 403);
        }

        global $wpdb;
        $table_permissions = $wpdb->prefix . 'kt_employee_permissions';
        $target_user_id    = (int)$_POST['target_user_id'];

        $data = array(
            'user_id'              => $target_user_id,
            'role_level'           => sanitize_text_field(wp_unslash($_POST['role_level'])),
            'can_view_financials'  => isset($_POST['can_view_financials']) ? 1 : 0,
            'can_create_invoice'   => isset($_POST['can_create_invoice']) ? 1 : 0,
            'can_collect_payment'  => isset($_POST['can_collect_payment']) ? 1 : 0,
            'can_edit_packages'    => isset($_POST['can_edit_packages']) ? 1 : 0,
            'can_manage_customers' => isset($_POST['can_manage_customers']) ? 1 : 0,
            'can_export_reports'   => isset($_POST['can_export_reports']) ? 1 : 0,
            'approval_status'      => sanitize_text_field(wp_unslash($_POST['approval_status'])),
        );

        $exists = $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM $table_permissions WHERE user_id = %d", $target_user_id));
        if ($exists) {
            $wpdb->update($table_permissions, $data, array('user_id' => $target_user_id));
        } else {
            $wpdb->insert($table_permissions, $data);
        }

        KT_DB::log_activity('staff_permission_update', 'Updated capabilities and approval status for user ID: ' . $target_user_id);
        wp_send_json_success(array('message' => 'Staff permissions updated successfully!'));
    }

    /**
     * Get Activity Audit Logs History
     */
    public static function kt_get_activity_logs() {
        self::verify_request();
        global $wpdb;

        $table_logs = $wpdb->prefix . 'kt_activity_logs';
        $logs = $wpdb->get_results("SELECT * FROM $table_logs ORDER BY id DESC LIMIT 100", ARRAY_A);

        wp_send_json_success(array('logs' => $logs));
    }

    /**
     * Get Subscriber Monthly Dues & Payment History Ledger
     */
    public static function kt_get_customer_history() {
        self::verify_request();
        global $wpdb;

        $customer_id = (int)$_POST['customer_id'];
        $table_customers = $wpdb->prefix . 'kt_customers';
        $table_invoices  = $wpdb->prefix . 'kt_invoices';

        $customer = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table_customers WHERE id = %d", $customer_id), ARRAY_A);
        if (!$customer) {
            wp_send_json_error(array('message' => 'Subscriber profile not found.'));
        }

        $history = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT i.*, u.display_name as collector_name FROM $table_invoices i 
                 LEFT JOIN {$wpdb->users} u ON i.collected_by_user_id = u.ID 
                 WHERE i.customer_id = %d ORDER BY i.id DESC",
                $customer_id
            ),
            ARRAY_A
        );

        $total_due  = (float)$wpdb->get_var($wpdb->prepare("SELECT SUM(amount_due) FROM $table_invoices WHERE customer_id = %d", $customer_id));
        $total_paid = (float)$wpdb->get_var($wpdb->prepare("SELECT SUM(amount_paid) FROM $table_invoices WHERE customer_id = %d", $customer_id));

        wp_send_json_success(array(
            'customer'   => $customer,
            'history'    => $history,
            'total_due'  => number_format($total_due, 2),
            'total_paid' => number_format($total_paid, 2),
            'balance'    => number_format(max(0, $total_due - $total_paid), 2)
        ));
    }

    /**
     * Get Products / Inventory List
     */
    public static function kt_get_products() {
        self::verify_request();
        global $wpdb;

        $table_products = $wpdb->prefix . 'kt_products';
        $products = $wpdb->get_results("SELECT * FROM $table_products ORDER BY id DESC", ARRAY_A);

        $can_view_financials = kt_current_user_can('can_view_financials');

        foreach ($products as &$p) {
            $p['margin'] = max(0, (float)$p['sale_price'] - (float)$p['cost_price']);
            if (!$can_view_financials) {
                unset($p['cost_price']);
                unset($p['margin']);
            }
        }

        wp_send_json_success(array('products' => $products));
    }

    /**
     * Save / Add Product Buying Entry
     */
    public static function kt_save_product() {
        self::verify_request('can_edit_packages');
        global $wpdb;

        $table_products = $wpdb->prefix . 'kt_products';
        $id = isset($_POST['id']) ? (int)$_POST['id'] : 0;

        $cost_price = floatval($_POST['cost_price']);
        $sale_price = floatval($_POST['sale_price']);
        $stock_qty  = (int)$_POST['stock_qty'];

        $data = array(
            'product_name' => sanitize_text_field(wp_unslash($_POST['product_name'])),
            'category'     => sanitize_text_field(wp_unslash($_POST['category'])),
            'cost_price'   => $cost_price,
            'sale_price'   => $sale_price,
            'stock_qty'    => $stock_qty,
            'unit'         => sanitize_text_field(wp_unslash($_POST['unit'])),
        );

        if ($id > 0) {
            $wpdb->update($table_products, $data, array('id' => $id));
            KT_DB::log_activity('product_update', 'Updated inventory buying entry: ' + $data['product_name']);
            wp_send_json_success(array('message' => 'Product inventory updated successfully!'));
        } else {
            $data['created_at'] = date('Y-m-d H:i:s');
            $wpdb->insert($table_products, $data);
            KT_DB::log_activity('product_buy', 'Purchased new inventory stock: ' . $data['product_name'] . ' (Qty: ' . $stock_qty . ')');
            wp_send_json_success(array('message' => 'New product stock entry added successfully!'));
        }
    }

    /**
     * Sell Hardware Product to Subscriber & Auto Calculate Total Price
     */
    public static function kt_sell_product() {
        self::verify_request('can_collect_payment');
        global $wpdb;

        $table_products = $wpdb->prefix . 'kt_products';
        $table_sales    = $wpdb->prefix . 'kt_product_sales';
        $table_customers= $wpdb->prefix . 'kt_customers';

        $product_id  = (int)$_POST['product_id'];
        $customer_id = (int)$_POST['customer_id'];
        $quantity    = max(1, (int)$_POST['quantity']);

        $product  = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table_products WHERE id = %d", $product_id), ARRAY_A);
        $customer = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table_customers WHERE id = %d", $customer_id), ARRAY_A);

        if (!$product || !$customer) {
            wp_send_json_error(array('message' => 'Invalid product or subscriber selected.'));
        }

        if ((int)$product['stock_qty'] < $quantity) {
            wp_send_json_error(array('message' => 'Insufficient stock! Available quantity: ' . $product['stock_qty']));
        }

        $total_cost = (float)$product['cost_price'] * $quantity;
        $total_sale = (float)$product['sale_price'] * $quantity;
        $profit     = max(0, $total_sale - $total_cost);

        // Deduct stock quantity
        $new_stock = (int)$product['stock_qty'] - $quantity;
        $wpdb->update($table_products, array('stock_qty' => $new_stock), array('id' => $product_id));

        // Record Sale
        $sale_data = array(
            'product_id'      => $product_id,
            'customer_id'     => $customer_id,
            'quantity'        => $quantity,
            'total_cost'      => $total_cost,
            'total_sale'      => $total_sale,
            'profit'          => $profit,
            'sold_by_user_id' => get_current_user_id(),
            'created_at'      => date('Y-m-d H:i:s')
        );
        $wpdb->insert($table_sales, $sale_data);
        $sale_id = $wpdb->insert_id;

        // Log Activity Audit
        KT_DB::log_activity('product_sale', 'Sold ' . $quantity . ' ' . $product['unit'] . ' of ' . $product['product_name'] . ' to ' . $customer['full_name'] . ' for PKR ' . number_format($total_sale, 2));

        wp_send_json_success(array(
            'message'    => 'Successfully sold ' . $quantity . ' ' . $product['unit'] . ' of ' . $product['product_name'] . ' to ' . $customer['full_name'] . ' for Total: PKR ' . number_format($total_sale, 2),
            'total_sale' => number_format($total_sale, 2),
            'sale_id'    => $sale_id
        ));
    }

    /**
     * Change Super Admin Password & Credentials
     */
    public static function kt_change_superadmin_password() {
        self::verify_request();
        $user_id = get_current_user_id();

        if (!user_can($user_id, 'administrator')) {
            wp_send_json_error(array('message' => 'Only WordPress Administrators / Super Admins can update security credentials.'), 403);
        }

        $new_username = isset($_POST['new_username']) ? sanitize_user(wp_unslash($_POST['new_username'])) : '';
        $new_password = isset($_POST['new_password']) ? $_POST['new_password'] : '';
        $confirm_pass = isset($_POST['confirm_password']) ? $_POST['confirm_password'] : '';

        if (empty($new_password)) {
            wp_send_json_error(array('message' => 'Please enter a new password.'));
        }

        if ($new_password !== $confirm_pass) {
            wp_send_json_error(array('message' => 'New password and confirmation do not match.'));
        }

        wp_set_password($new_password, $user_id);

        KT_DB::log_activity('security_password_change', 'Updated Super Admin password for user ID: ' . $user_id);

        wp_send_json_success(array(
            'message' => '🔑 Super Admin password updated successfully! Please use your new password for your next login.'
        ));
    }

    /**
     * Delete Customer / Subscriber Profile
     */
    public static function kt_delete_customer() {
        self::verify_request('can_manage_customers');
        global $wpdb;

        $table_customers = $wpdb->prefix . 'kt_customers';
        $customer_id     = (int)$_POST['customer_id'];

        $customer = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table_customers WHERE id = %d", $customer_id), ARRAY_A);
        if (!$customer) {
            wp_send_json_error(array('message' => 'Subscriber not found.'));
        }

        $wpdb->delete($table_customers, array('id' => $customer_id));
        KT_DB::log_activity('subscriber_delete', 'Deleted subscriber account: ' . $customer['full_name'] . ' (' . $customer['customer_code'] . ')');

        wp_send_json_success(array('message' => 'Subscriber account deleted successfully!'));
    }

    /**
     * Delete Invoice Record
     */
    public static function kt_delete_invoice() {
        self::verify_request('can_create_invoice');
        global $wpdb;

        $table_invoices = $wpdb->prefix . 'kt_invoices';
        $invoice_id     = (int)$_POST['invoice_id'];

        $invoice = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table_invoices WHERE id = %d", $invoice_id), ARRAY_A);
        if (!$invoice) {
            wp_send_json_error(array('message' => 'Invoice not found.'));
        }

        $wpdb->delete($table_invoices, array('id' => $invoice_id));
        KT_DB::log_activity('invoice_delete', 'Deleted invoice: ' . $invoice['invoice_number']);

        wp_send_json_success(array('message' => 'Invoice deleted successfully!'));
    }

    /**
     * Toggle Invoice Payment Status (Paid / Unpaid)
     */
    public static function kt_toggle_invoice_status() {
        self::verify_request('can_collect_payment');
        global $wpdb;

        $table_invoices = $wpdb->prefix . 'kt_invoices';
        $invoice_id     = (int)$_POST['invoice_id'];
        $status         = sanitize_text_field(wp_unslash($_POST['status']));

        $invoice = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table_invoices WHERE id = %d", $invoice_id), ARRAY_A);
        if (!$invoice) {
            wp_send_json_error(array('message' => 'Invoice not found.'));
        }

        $data = array(
            'payment_status' => $status,
        );

        if ($status === 'paid') {
            $data['amount_paid']          = $invoice['amount_due'];
            $data['paid_at']              = date('Y-m-d H:i:s');
            $data['collected_by_user_id'] = get_current_user_id();
        } else {
            $data['amount_paid']          = 0.00;
            $data['paid_at']              = null;
        }

        $wpdb->update($table_invoices, $data, array('id' => $invoice_id));
        KT_DB::log_activity('invoice_status_update', 'Updated invoice ' . $invoice['invoice_number'] . ' status to: ' . strtoupper($status));

        wp_send_json_success(array('message' => 'Invoice status changed to ' . strtoupper($status) . '!'));
    }

    /**
     * Delete Hardware Product Stock Entry
     */
    public static function kt_delete_product() {
        self::verify_request('can_edit_packages');
        global $wpdb;

        $table_products = $wpdb->prefix . 'kt_products';
        $product_id     = (int)$_POST['product_id'];

        $product = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table_products WHERE id = %d", $product_id), ARRAY_A);
        if (!$product) {
            wp_send_json_error(array('message' => 'Hardware product not found.'));
        }

        $wpdb->delete($table_products, array('id' => $product_id));
        KT_DB::log_activity('product_delete', 'Deleted hardware product: ' . $product['product_name']);

        wp_send_json_success(array('message' => 'Hardware product deleted successfully!'));
    }
}
