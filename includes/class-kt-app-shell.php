<?php
if (!defined('ABSPATH')) {
    exit;
}

class KT_App_Shell {

    public static function init() {
        add_action('template_redirect', array(__CLASS__, 'render_app_shell'), 1);
        add_shortcode('khan_telecom_app', array(__CLASS__, 'render_shortcode'));
    }

    public static function render_shortcode() {
        return '<div id="kt-shortcode-container"><p>Khan Telecom Portal is loading...</p></div>';
    }

    public static function render_app_shell() {
        global $post;

        $is_portal = false;
        if (is_page(KT_PAGE_SLUG)) {
            $is_portal = true;
        } elseif (is_a($post, 'WP_Post') && has_shortcode($post->post_content, 'khan_telecom_app')) {
            $is_portal = true;
        }

        if (!$is_portal) {
            return;
        }

        // Clean output buffer to eliminate theme headers/footers
        if (ob_get_length()) {
            ob_clean();
        }

        $user_id = get_current_user_id();

        if (!$user_id) {
            self::render_login_view();
            exit;
        }

        $user_data = get_userdata($user_id);
        $permissions = KT_RBAC::get_user_permissions($user_id);
        $role_label = $permissions ? strtoupper(str_replace('_', ' ', $permissions['role_level'])) : 'EMPLOYEE';

        self::render_standalone_canvas($user_data, $role_label, $permissions);
        exit;
    }

    /**
     * Standalone Glassmorphism Mobile-First Login View
     */
    private static function render_login_view() {
        $nonce = wp_create_nonce('kt_app_nonce');
        $ajax_url = admin_url('admin-ajax.php');
        ?>
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <title>Khan Telecom Portal - Login</title>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
            <link rel="stylesheet" href="<?php echo KT_PLUGIN_URL; ?>assets/css/kt-app.css?ver=<?php echo KT_VERSION; ?>">
        </head>
        <body class="kt-login-body">
            <div class="kt-login-wrapper">
                <div class="kt-glass-card">
                    <div class="kt-brand">
                        <div class="brand-icon">⚡</div>
                        <h1>KHAN TELECOM</h1>
                        <p class="brand-tagline">ISP Management Engine</p>
                    </div>

                    <div id="kt-login-alert" class="kt-alert" style="display: none;"></div>

                    <form id="kt-login-form">
                        <input type="hidden" name="nonce" value="<?php echo esc_attr($nonce); ?>">
                        <div class="form-group">
                            <label for="log">Username or Email</label>
                            <input type="text" id="log" name="log" placeholder="Enter staff username" required autocomplete="username">
                        </div>

                        <div class="form-group">
                            <label for="pwd">Password</label>
                            <input type="password" id="pwd" name="pwd" placeholder="••••••••" required autocomplete="current-password">
                        </div>

                        <div class="form-row flex-between">
                            <label class="checkbox-container">
                                <input type="checkbox" name="rememberme" value="forever" checked>
                                <span>Remember Me</span>
                            </label>
                        </div>

                        <button type="submit" id="kt-login-btn" class="btn btn-primary btn-block">
                            <span>Sign In to Portal</span>
                        </button>
                    </form>

                    <div class="login-footer">
                    </div>
                </div>
            </div>

            <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
            <script>
                var ktConfig = {
                    ajaxUrl: '<?php echo esc_js($ajax_url); ?>',
                    nonce: '<?php echo esc_js($nonce); ?>'
                };
            </script>
            <script src="<?php echo KT_PLUGIN_URL; ?>assets/js/kt-app.js?ver=<?php echo KT_VERSION; ?>"></script>
        </body>
        </html>
        <?php
    }

    /**
     * Main Standalone Single Page App Canvas
     */
    private static function render_standalone_canvas($user_data, $role_label, $permissions) {
        $nonce = wp_create_nonce('kt_app_nonce');
        $ajax_url = admin_url('admin-ajax.php');
        ?>
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <meta name="apple-mobile-web-app-capable" content="yes">
            <meta name="theme-color" content="#0d1117">
            <title>Khan Telecom ISP Portal</title>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
            <link rel="stylesheet" href="<?php echo KT_PLUGIN_URL; ?>assets/css/kt-app.css?ver=<?php echo KT_VERSION; ?>">
        </head>
        <body class="kt-app-body">
            <!-- App Shell Layout -->
            <div class="kt-app-shell">

                <!-- Header Status Bar -->
                <header class="kt-header">
                    <div class="header-left">
                        <button id="kt-drawer-toggle" class="btn-icon" aria-label="Toggle Menu">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                        </button>
                        <div class="kt-logo">
                            <span class="logo-badge">⚡</span>
                            <div class="logo-text">
                                <h2>KHAN TELECOM</h2>
                                <span class="badge-status">LIVE SYNC</span>
                            </div>
                        </div>
                    </div>

                    <div class="header-right">
                        <div class="user-pill">
                            <div class="user-avatar"><?php echo strtoupper(substr($user_data->display_name, 0, 1)); ?></div>
                            <div class="user-info hide-mobile">
                                <span class="user-name"><?php echo esc_html($user_data->display_name); ?></span>
                                <span class="user-role"><?php echo esc_html($role_label); ?></span>
                            </div>
                        </div>
                        <button id="btn-open-change-pass-modal" class="btn btn-sm btn-secondary" title="Change Password">🔑 Password</button>
                        <button id="kt-logout-btn" class="btn btn-sm btn-outline-danger" title="Logout">Logout</button>
                    </div>
                </header>

                <div class="kt-main-wrapper">
                    <!-- Collapsible Sidebar & Mobile Drawer -->
                    <aside id="kt-sidebar" class="kt-sidebar">
                        <nav class="sidebar-nav">
                            <a href="#dashboard" class="nav-item active" data-view="dashboard">
                                <span class="nav-icon">📊</span>
                                <span class="nav-text">Dashboard</span>
                            </a>
                            <a href="#customers" class="nav-item" data-view="customers">
                                <span class="nav-icon">👥</span>
                                <span class="nav-text">Customers</span>
                            </a>
                            <a href="#packages" class="nav-item" data-view="packages">
                                <span class="nav-icon">⚡</span>
                                <span class="nav-text">Packages</span>
                            </a>
                            <a href="#products" class="nav-item" data-view="products">
                                <span class="nav-icon">📦</span>
                                <span class="nav-text">Products & Stock</span>
                            </a>
                            <a href="#invoices" class="nav-item" data-view="invoices">
                                <span class="nav-icon">📄</span>
                                <span class="nav-text">Invoices & Recovery</span>
                            </a>
                            <?php if (kt_current_user_can('can_export_reports') || user_can($user_data->ID, 'administrator')): ?>
                            <a href="#staff" class="nav-item" data-view="staff">
                                <span class="nav-icon">🔐</span>
                                <span class="nav-text">Staff Matrix</span>
                            </a>
                            <a href="#logs" class="nav-item" data-view="logs">
                                <span class="nav-icon">📜</span>
                                <span class="nav-text">Activity Logs</span>
                            </a>
                            <?php endif; ?>
                        </nav>
                        
                        <div class="sidebar-footer">
                            <p style="margin:0 0 4px 0; font-size:12px; font-weight:600; color:var(--text-main);">Khan Telecom v<?php echo KT_VERSION; ?></p>
                            <p class="credits" style="margin:0; font-size:11px; color:var(--text-muted);">Developed by Muhammad Irfan</p>
                        </div>
                    </aside>

                    <!-- Central Viewport -->
                    <main id="kt-viewport" class="kt-viewport">
                        <div id="kt-view-loader" class="kt-loader" style="display:none;">
                            <div class="spinner"></div>
                        </div>

                        <div id="kt-view-content" class="view-container">
                            <!-- Views render dynamically via kt-app.js -->
                        </div>
                    </main>
                </div>

                <!-- Footer Bar -->
                <footer class="kt-app-footer">
                    <span>Khan Telecom ISP Engine &copy; <?php echo date('Y'); ?></span>
                </footer>
            </div>

            <!-- Modals Container -->
            <div id="kt-modal-backdrop" class="kt-modal-backdrop" style="display: none;"></div>

            <!-- 1. Customer Modal -->
            <div id="kt-customer-modal" class="kt-modal" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 id="customer-modal-title">Register New Customer</h3>
                        <button class="btn-close modal-close">&times;</button>
                    </div>
                    <form id="kt-customer-form">
                        <input type="hidden" name="id" value="0">
                        <div class="modal-body grid-2">
                            <div class="form-group">
                                <label>Full Name *</label>
                                <input type="text" name="full_name" required placeholder="e.g. Muhammad Ali">
                            </div>
                            <div class="form-group">
                                <label>Phone Number (WhatsApp) *</label>
                                <input type="text" name="phone_number" required placeholder="03001234567">
                            </div>
                            <div class="form-group">
                                <label>CNIC ID</label>
                                <input type="text" name="cnic_id" placeholder="35202-0000000-0">
                            </div>
                            <div class="form-group">
                                <label>Area / Sector *</label>
                                <input type="text" name="area_sector" required placeholder="Sector F-11 / Phase 2">
                            </div>
                            <div class="form-group span-2">
                                <label>Full Address</label>
                                <textarea name="address" rows="2" placeholder="House #, Street #..."></textarea>
                            </div>
                            <div class="form-group">
                                <label>ISP Package *</label>
                                <select name="package_id" id="cust-package-select" required></select>
                            </div>
                            <div class="form-group">
                                <label>Assigned IP / IPOE</label>
                                <input type="text" name="assigned_ip_ipoe" placeholder="192.168.10.50">
                            </div>
                            <div class="form-group">
                                <label>Connection Type</label>
                                <select name="connection_type">
                                    <option value="Fiber_FTTH">Fiber FTTH</option>
                                    <option value="Wireless">Wireless</option>
                                    <option value="Ethernet">Ethernet</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Billing Cycle Day (1-31)</label>
                                <input type="number" name="billing_cycle_day" min="1" max="31" value="1">
                            </div>
                            <div class="form-group">
                                <label>Status</label>
                                <select name="status">
                                    <option value="active">Active</option>
                                    <option value="pending">Pending Installation</option>
                                    <option value="suspended">Suspended</option>
                                    <option value="expired">Expired</option>
                                </select>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary modal-close">Cancel</button>
                            <button type="submit" class="btn btn-primary">Save</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- 2. Package Modal -->
            <div id="kt-package-modal" class="kt-modal" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 id="package-modal-title">Create Package Tier</h3>
                        <button class="btn-close modal-close">&times;</button>
                    </div>
                    <form id="kt-package-form">
                        <input type="hidden" name="id" value="0">
                        <div class="modal-body grid-2">
                            <div class="form-group span-2">
                                <label>Package Name *</label>
                                <input type="text" name="package_name" required placeholder="e.g. 20 Mbps Fiber Pro">
                            </div>
                            <div class="form-group">
                                <label>Speed (Mbps) *</label>
                                <input type="number" name="speed_mbps" required min="1" value="20">
                            </div>
                            <div class="form-group">
                                <label>Status</label>
                                <select name="status">
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Upstream Cost Price (PKR) *</label>
                                <input type="number" step="0.01" id="pkg-cost" name="cost_price" required value="1000">
                            </div>
                            <div class="form-group">
                                <label>Retail Sale Price (PKR) *</label>
                                <input type="number" step="0.01" id="pkg-sale" name="sale_price" required value="2000">
                            </div>
                            <div class="form-group span-2 margin-calc-box">
                                <span>Calculated Profit Margin / Subscriber:</span>
                                <strong id="pkg-margin-preview">PKR 1000.00</strong>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary modal-close">Cancel</button>
                            <button type="submit" class="btn btn-primary">Save</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- 3. Create Invoice Modal -->
            <div id="kt-invoice-modal" class="kt-modal" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Generate Customer Invoice</h3>
                        <button class="btn-close modal-close">&times;</button>
                    </div>
                    <form id="kt-invoice-form">
                        <div class="modal-body">
                            <div class="form-group">
                                <label>Select Customer *</label>
                                <select name="customer_id" id="invoice-customer-select" required></select>
                            </div>
                            <div class="form-group">
                                <label>Billing Month *</label>
                                <input type="month" name="billing_month" required value="<?php echo date('Y-m'); ?>">
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary modal-close">Cancel</button>
                            <button type="submit" class="btn btn-primary">Save</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- 4. Collect Fee Payment Modal -->
            <div id="kt-payment-modal" class="kt-modal" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Collect Customer Payment</h3>
                        <button class="btn-close modal-close">&times;</button>
                    </div>
                    <form id="kt-payment-form">
                        <input type="hidden" name="invoice_id" id="pay-invoice-id" value="0">
                        <div class="modal-body grid-2">
                            <div class="form-group span-2 info-box">
                                <span id="pay-customer-name">Customer</span>
                                <strong id="pay-due-amount">Due: PKR 0.00</strong>
                            </div>
                            <div class="form-group">
                                <label>Amount Paid (PKR) *</label>
                                <input type="number" step="0.01" name="amount_paid" id="pay-amount-input" required>
                            </div>
                            <div class="form-group">
                                <label>Discount (PKR)</label>
                                <input type="number" step="0.01" name="discount" value="0">
                            </div>
                            <div class="form-group span-2">
                                <label>Payment Method</label>
                                <select name="payment_method">
                                    <option value="cash">Cash Settlement</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="easypaisa_jazzcash">Easypaisa / JazzCash</option>
                                </select>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary modal-close">Cancel</button>
                            <button type="submit" class="btn btn-success">Save</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- 5. Thermal Receipt & WhatsApp Modal -->
            <div id="kt-receipt-modal" class="kt-modal" style="display: none;">
                <div class="modal-content modal-receipt">
                    <div class="modal-header">
                        <h3>Payment Confirmation & Slip</h3>
                        <button class="btn-close modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div id="receipt-preview-container"></div>
                    </div>
                    <div class="modal-footer flex-between">
                        <a id="btn-whatsapp-send" href="#" target="_blank" class="btn btn-whatsapp" style="font-size:14px; padding:10px 16px; font-weight:700;">
                            <span>📱 Send WhatsApp Slip</span>
                        </a>
                        <div>
                            <button type="button" id="btn-print-slip" class="btn btn-primary" style="font-size:14px; padding:10px 16px; font-weight:700;">🖨️ Save / Print Slip (PDF)</button>
                            <button type="button" class="btn btn-secondary modal-close">Close</button>
                        </div>
                    </div>
                </div>
            <!-- 6. Subscriber Dues & Payment History Ledger Modal -->
            <div id="kt-ledger-modal" class="kt-modal" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 id="ledger-modal-title">Subscriber Payment History Ledger</h3>
                        <button class="btn-close modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div id="ledger-summary-box" class="info-box margin-calc-box" style="margin-bottom:16px;">
                            <div>
                                <span id="ledger-cust-name" style="font-weight:bold; display:block;">Subscriber Name</span>
                                <span id="ledger-cust-code" style="font-size:12px; color:var(--text-muted);">KT-1001</span>
                            </div>
                            <div style="text-align:right;">
                                <span style="font-size:11px; display:block;">Current Dues Balance</span>
                                <strong id="ledger-cust-balance" style="color:#ff7b72; font-size:16px;">PKR 0.00</strong>
                            </div>
                        </div>

                        <div class="kt-table-container">
                            <table class="kt-table">
                                <thead>
                                    <tr>
                                        <th>Month / Inv No</th>
                                        <th>Amount Due</th>
                                        <th>Paid</th>
                                        <th>Discount</th>
                                        <th>Status</th>
                                        <th>Collector & Date</th>
                                    </tr>
                                </thead>
                                <tbody id="ledger-table-body">
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary modal-close">Close Ledger</button>
                    </div>
                </div>
            </div>

            <!-- 7. Buy / Add Product Stock Modal -->
            <div id="kt-product-modal" class="kt-modal" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 id="product-modal-title">Buy / Add Hardware Product Stock</h3>
                        <button class="btn-close modal-close">&times;</button>
                    </div>
                    <form id="kt-product-form">
                        <input type="hidden" name="id" value="0">
                        <div class="modal-body grid-2">
                            <div class="form-group span-2">
                                <label>Product Name *</label>
                                <input type="text" name="product_name" required placeholder="e.g. Dual Band AC1200 WiFi Router">
                            </div>
                            <div class="form-group">
                                <label>Category</label>
                                <select name="category">
                                    <option value="Routers">Routers</option>
                                    <option value="Cables">Fiber/LAN Cables</option>
                                    <option value="ONU/ONT">ONU/ONT Devices</option>
                                    <option value="Accessories">Accessories & Patch Cords</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Unit Type</label>
                                <input type="text" name="unit" value="pcs" placeholder="pcs / meters / box">
                            </div>
                            <div class="form-group">
                                <label>Wholesale Buying Cost Price (PKR) *</label>
                                <input type="number" step="0.01" id="prod-cost" name="cost_price" required value="4000">
                            </div>
                            <div class="form-group">
                                <label>Retail Selling Price (PKR) *</label>
                                <input type="number" step="0.01" id="prod-sale" name="sale_price" required value="6000">
                            </div>
                            <div class="form-group span-2">
                                <label>Buying Stock Quantity Purchased *</label>
                                <input type="number" name="stock_qty" required min="1" value="10">
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary modal-close">Cancel</button>
                            <button type="submit" class="btn btn-success">Save</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- 8. Sell Product to Subscriber Modal -->
            <div id="kt-sell-product-modal" class="kt-modal" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Sell Hardware Equipment to Subscriber</h3>
                        <button class="btn-close modal-close">&times;</button>
                    </div>
                    <form id="kt-sell-product-form">
                        <div class="modal-body grid-2">
                            <div class="form-group span-2">
                                <label>Select Hardware Product *</label>
                                <select name="product_id" id="sell-product-select" required></select>
                            </div>
                            <div class="form-group span-2">
                                <label>Select Subscriber *</label>
                                <select name="customer_id" id="sell-customer-select" required></select>
                            </div>
                            <div class="form-group">
                                <label>Quantity Sold *</label>
                                <input type="number" name="quantity" id="sell-qty-input" required min="1" value="1">
                            </div>
                            <div class="form-group">
                                <label>Unit Retail Price (PKR)</label>
                                <input type="text" id="sell-unit-price" readonly value="PKR 0.00">
                            </div>
                            <div class="form-group span-2 margin-calc-box">
                                <span>Auto-Calculated Total Bill:</span>
                                <strong id="sell-total-preview" style="color:#7ee787; font-size:18px;">PKR 0.00</strong>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary modal-close">Cancel</button>
                            <button type="submit" class="btn btn-success">Save</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- 11. Change Super Admin Password Modal -->
            <div id="kt-change-password-modal" class="kt-modal" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Change Super Admin Password & Credentials</h3>
                        <button class="btn-close modal-close">&times;</button>
                    </div>
                    <form id="kt-change-password-form">
                        <div class="modal-body">
                            <div class="form-group">
                                <label>Super Admin Username</label>
                                <input type="text" name="new_username" id="change-pass-username" required placeholder="e.g. saif">
                            </div>
                            <div class="form-group">
                                <label>New Password *</label>
                                <div style="position: relative;">
                                    <input type="password" name="new_password" id="change-pass-new" required placeholder="••••••••" style="padding-right: 40px; width: 100%;">
                                    <button type="button" class="btn-toggle-pass" data-target="#change-pass-new" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: transparent; border: none; cursor: pointer; font-size: 16px;">👁️</button>
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Confirm New Password *</label>
                                <div style="position: relative;">
                                    <input type="password" name="confirm_password" id="change-pass-confirm" required placeholder="••••••••" style="padding-right: 40px; width: 100%;">
                                    <button type="button" class="btn-toggle-pass" data-target="#change-pass-confirm" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: transparent; border: none; cursor: pointer; font-size: 16px;">👁️</button>
                                </div>
                            </div>
                            <div class="form-group info-box" style="font-size: 12px; margin-top: 10px;">
                                <span>🔒 Note: Changing Super Admin credentials updates login access across the entire portal in real time.</span>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary modal-close">Cancel</button>
                            <button type="submit" class="btn btn-primary">Save</button>
                        </div>
                    </form>
                </div>
            </div>

            <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
            <script>
                var ktConfig = {
                    ajaxUrl: '<?php echo esc_js($ajax_url); ?>',
                    nonce: '<?php echo esc_js($nonce); ?>'
                };
            </script>
            <script src="<?php echo KT_PLUGIN_URL; ?>assets/js/kt-app.js?ver=<?php echo KT_VERSION; ?>"></script>
        </body>
        </html>
        <?php
    }
}
