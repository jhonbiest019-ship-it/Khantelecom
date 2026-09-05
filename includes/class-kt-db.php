<?php
if (!defined('ABSPATH')) {
    exit;
}

class KT_DB {

    public static function install() {
        global $wpdb;
        require_once ABSPATH . 'wp-admin/includes/upgrade.php';

        $charset_collate = $wpdb->get_charset_collate();

        // 1. Packages Table
        $table_packages = $wpdb->prefix . 'kt_packages';
        $sql_packages = "CREATE TABLE $table_packages (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            package_name varchar(100) NOT NULL,
            speed_mbps int(11) NOT NULL DEFAULT 10,
            cost_price decimal(10,2) NOT NULL DEFAULT 0.00,
            sale_price decimal(10,2) NOT NULL DEFAULT 0.00,
            margin decimal(10,2) NOT NULL DEFAULT 0.00,
            status enum('active','inactive') NOT NULL DEFAULT 'active',
            PRIMARY KEY  (id)
        ) $charset_collate;";
        dbDelta($sql_packages);

        // 2. Customers Table
        $table_customers = $wpdb->prefix . 'kt_customers';
        $sql_customers = "CREATE TABLE $table_customers (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            customer_code varchar(50) NOT NULL,
            full_name varchar(150) NOT NULL,
            phone_number varchar(30) NOT NULL,
            cnic_id varchar(50) DEFAULT '',
            address text,
            area_sector varchar(100) DEFAULT '',
            package_id bigint(20) NOT NULL,
            assigned_ip_ipoe varchar(50) DEFAULT NULL,
            connection_type enum('Fiber_FTTH','Wireless','Ethernet') NOT NULL DEFAULT 'Fiber_FTTH',
            billing_cycle_day int(11) NOT NULL DEFAULT 1,
            status enum('active','suspended','expired','pending') NOT NULL DEFAULT 'active',
            created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY  (id),
            UNIQUE KEY customer_code (customer_code)
        ) $charset_collate;";
        dbDelta($sql_customers);

        // 3. Invoices Table
        $table_invoices = $wpdb->prefix . 'kt_invoices';
        $sql_invoices = "CREATE TABLE $table_invoices (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            invoice_number varchar(50) NOT NULL,
            customer_id bigint(20) NOT NULL,
            amount_due decimal(10,2) NOT NULL DEFAULT 0.00,
            amount_paid decimal(10,2) NOT NULL DEFAULT 0.00,
            discount decimal(10,2) NOT NULL DEFAULT 0.00,
            billing_month varchar(20) NOT NULL,
            payment_status enum('paid','unpaid','partial') NOT NULL DEFAULT 'unpaid',
            payment_method enum('cash','bank_transfer','easypaisa_jazzcash') NOT NULL DEFAULT 'cash',
            collected_by_user_id bigint(20) DEFAULT NULL,
            paid_at datetime DEFAULT NULL,
            created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY  (id),
            UNIQUE KEY invoice_number (invoice_number)
        ) $charset_collate;";
        dbDelta($sql_invoices);

        // 4. Employee Permissions Table
        $table_permissions = $wpdb->prefix . 'kt_employee_permissions';
        $sql_permissions = "CREATE TABLE $table_permissions (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            user_id bigint(20) NOT NULL,
            role_level enum('super_admin','admin','employee') NOT NULL DEFAULT 'employee',
            can_view_financials tinyint(1) NOT NULL DEFAULT 0,
            can_create_invoice tinyint(1) NOT NULL DEFAULT 1,
            can_collect_payment tinyint(1) NOT NULL DEFAULT 1,
            can_edit_packages tinyint(1) NOT NULL DEFAULT 0,
            can_manage_customers tinyint(1) NOT NULL DEFAULT 1,
            can_export_reports tinyint(1) NOT NULL DEFAULT 0,
            approval_status enum('approved','pending_approval','revoked') NOT NULL DEFAULT 'pending_approval',
            PRIMARY KEY  (id),
            UNIQUE KEY user_id (user_id)
        ) $charset_collate;";
        dbDelta($sql_permissions);

        // 5. System Activity Audit Logs Table
        $table_logs = $wpdb->prefix . 'kt_activity_logs';
        $sql_logs = "CREATE TABLE $table_logs (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            user_id bigint(20) NOT NULL,
            user_name varchar(150) NOT NULL,
            role_level varchar(50) NOT NULL,
            action_type varchar(100) NOT NULL,
            description text NOT NULL,
            ip_address varchar(50) DEFAULT '',
            created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY  (id)
        ) $charset_collate;";
        dbDelta($sql_logs);

        // 6. Products / Inventory Table
        $table_products = $wpdb->prefix . 'kt_products';
        $sql_products = "CREATE TABLE $table_products (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            product_name varchar(150) NOT NULL,
            category varchar(100) DEFAULT 'Hardware',
            cost_price decimal(10,2) NOT NULL DEFAULT 0.00,
            sale_price decimal(10,2) NOT NULL DEFAULT 0.00,
            stock_qty int(11) NOT NULL DEFAULT 0,
            unit varchar(20) DEFAULT 'pcs',
            created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY  (id)
        ) $charset_collate;";
        dbDelta($sql_products);

        // 7. Product Sales Table
        $table_sales = $wpdb->prefix . 'kt_product_sales';
        $sql_sales = "CREATE TABLE $table_sales (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            product_id bigint(20) NOT NULL,
            customer_id bigint(20) NOT NULL,
            quantity int(11) NOT NULL DEFAULT 1,
            total_cost decimal(10,2) NOT NULL DEFAULT 0.00,
            total_sale decimal(10,2) NOT NULL DEFAULT 0.00,
            profit decimal(10,2) NOT NULL DEFAULT 0.00,
            sold_by_user_id bigint(20) DEFAULT NULL,
            created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY  (id)
        ) $charset_collate;";
        dbDelta($sql_sales);

        // Seed Default Data
        self::seed_default_data();
    }

    public static function log_activity($action_type, $description, $user_id = null) {
        global $wpdb;
        if (!$user_id) {
            $user_id = get_current_user_id();
        }

        $user_info = get_userdata($user_id);
        $user_name = $user_info ? $user_info->display_name : 'System User';

        $perm = KT_RBAC::get_user_permissions($user_id);
        $role_level = $perm ? $perm['role_level'] : 'guest';

        $table_logs = $wpdb->prefix . 'kt_activity_logs';
        $wpdb->insert($table_logs, array(
            'user_id'     => $user_id,
            'user_name'   => $user_name,
            'role_level'  => $role_level,
            'action_type' => $action_type,
            'description' => $description,
            'ip_address'  => isset($_SERVER['REMOTE_ADDR']) ? sanitize_text_field($_SERVER['REMOTE_ADDR']) : '127.0.0.1',
            'created_at'  => date('Y-m-d H:i:s')
        ));
    }

    private static function seed_default_data() {
        global $wpdb;

        // Seed default packages if none exist
        $table_packages = $wpdb->prefix . 'kt_packages';
        $pkg_count = $wpdb->get_var("SELECT COUNT(*) FROM $table_packages");
        if ((int)$pkg_count === 0) {
            $default_packages = array(
                array(
                    'package_name' => '10 Mbps Fiber Basic',
                    'speed_mbps'   => 10,
                    'cost_price'   => 800.00,
                    'sale_price'   => 1500.00,
                    'margin'       => 700.00,
                    'status'       => 'active'
                ),
                array(
                    'package_name' => '20 Mbps Fiber Pro',
                    'speed_mbps'   => 20,
                    'cost_price'   => 1200.00,
                    'sale_price'   => 2200.00,
                    'margin'       => 1000.00,
                    'status'       => 'active'
                ),
                array(
                    'package_name' => '50 Mbps Ultra Gaming',
                    'speed_mbps'   => 50,
                    'cost_price'   => 2500.00,
                    'sale_price'   => 4500.00,
                    'margin'       => 2000.00,
                    'status'       => 'active'
                ),
            );

            foreach ($default_packages as $pkg) {
                $wpdb->insert($table_packages, $pkg);
            }
        }

        // Seed default inventory products if empty
        $table_products = $wpdb->prefix . 'kt_products';
        $prod_count = $wpdb->get_var("SELECT COUNT(*) FROM $table_products");
        if ((int)$prod_count === 0) {
            $default_products = array(
                array('product_name' => 'Dual Band AC1200 WiFi Router', 'category' => 'Routers', 'cost_price' => 4500.00, 'sale_price' => 6500.00, 'stock_qty' => 25, 'unit' => 'pcs'),
                array('product_name' => 'Fiber Optic Drop Cable 2-Core', 'category' => 'Cables', 'cost_price' => 18.00, 'sale_price' => 30.00, 'stock_qty' => 1000, 'unit' => 'meters'),
                array('product_name' => 'XPON Fiber ONU Node Device', 'category' => 'ONU/ONT', 'cost_price' => 2200.00, 'sale_price' => 3500.00, 'stock_qty' => 15, 'unit' => 'pcs'),
                array('product_name' => 'Cat6 Ethernet Cable (Pre-Made 3M)', 'category' => 'Accessories', 'cost_price' => 250.00, 'sale_price' => 500.00, 'stock_qty' => 40, 'unit' => 'pcs')
            );
            foreach ($default_products as $prod) {
                $wpdb->insert($table_products, $prod);
            }
        }

        // Grant current WP admin Super Admin rights if empty
        $current_user_id = get_current_user_id();
        if ($current_user_id) {
            $table_permissions = $wpdb->prefix . 'kt_employee_permissions';
            $perm_exists = $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM $table_permissions WHERE user_id = %d", $current_user_id));
            if ((int)$perm_exists === 0) {
                $wpdb->insert($table_permissions, array(
                    'user_id'              => $current_user_id,
                    'role_level'           => 'super_admin',
                    'can_view_financials'  => 1,
                    'can_create_invoice'   => 1,
                    'can_collect_payment'  => 1,
                    'can_edit_packages'    => 1,
                    'can_manage_customers' => 1,
                    'can_export_reports'   => 1,
                    'approval_status'      => 'approved',
                ));
            }
        }
    }

    public static function generate_customer_code() {
        global $wpdb;
        $table_customers = $wpdb->prefix . 'kt_customers';
        $max_id = $wpdb->get_var("SELECT MAX(id) FROM $table_customers");
        $next_id = ($max_id ? (int)$max_id : 0) + 1001;
        return 'KT-' . $next_id;
    }

    public static function generate_invoice_number() {
        global $wpdb;
        $table_invoices = $wpdb->prefix . 'kt_invoices';
        $month_prefix = date('Ym');
        $max_id = $wpdb->get_var("SELECT MAX(id) FROM $table_invoices");
        $next_id = ($max_id ? (int)$max_id : 0) + 1;
        return 'INV-' . $month_prefix . '-' . str_pad($next_id, 4, '0', STR_PAD_LEFT);
    }
}
