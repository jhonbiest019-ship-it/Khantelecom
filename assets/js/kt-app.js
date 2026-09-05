/**
 * Khan Telecom ISP Manager - Single Page Application Engine & Real-Time Polling
 * Author: Saif
 */

(function($) {
    'use strict';

    var KT_App = {
        currentView: 'dashboard',
        pollingInterval: null,

        init: function() {
            this.bindLogin();

            if ($('.kt-app-body').length > 0) {
                this.bindNavigation();
                this.bindModals();
                this.bindCalculators();
                this.bindActions();
                
                // Initial Route Load
                var hash = window.location.hash.replace('#', '') || 'dashboard';
                this.switchView(hash);

                // Start 10-Second Real-Time Heartbeat Polling
                this.startHeartbeat();
            }
        },

        getUserSession: function() {
            var stored = localStorage.getItem('kt_user');
            if (stored) {
                try { return JSON.parse(stored); } catch(e) {}
            }
            return {
                user_id: 1,
                user_login: 'saif',
                display_name: 'Saif',
                role_level: 'super_admin',
                permissions: { can_view_financials: 1, can_create_invoice: 1, can_collect_payment: 1, can_edit_packages: 1, can_manage_customers: 1, can_export_reports: 1 }
            };
        },

        updateHeaderUserInfo: function() {
            var u = this.getUserSession();
            $('.user-avatar').text(u.display_name.charAt(0).toUpperCase());
            $('.user-name').text(u.display_name);
            $('.user-role').text(u.role_level.toUpperCase().replace('_', ' '));
        },

        /* ==================== LOGIN & SESSION HANDLER ==================== */
        bindLogin: function() {
            var self = this;
            this.updateHeaderUserInfo();

            // Login Form Submit
            $('#kt-login-form').on('submit', function(e) {
                e.preventDefault();
                var $btn = $('#kt-login-btn');
                var $alert = $('#kt-login-alert');

                $btn.prop('disabled', true).text('Authenticating...');
                $alert.hide().removeClass('kt-alert-danger kt-alert-success');

                var data = $(this).serialize() + '&action=kt_login&nonce=' + ktConfig.nonce;

                $.post(ktConfig.ajaxUrl, data, function(res) {
                    $btn.prop('disabled', false).text('Sign In to Portal');
                    if (res.success) {
                        $alert.addClass('kt-alert-success').text(res.data.message).show();
                        if (res.data.user) {
                            localStorage.setItem('kt_user', JSON.stringify(res.data.user));
                            self.updateHeaderUserInfo();
                        }
                        setTimeout(function() {
                            $('#kt-login-modal, #kt-modal-backdrop').hide();
                            $alert.hide();
                            self.switchView(self.currentView || 'dashboard');
                        }, 600);
                    } else {
                        $alert.addClass('kt-alert-danger').text(res.data.message || 'Login failed.').show();
                    }
                }).fail(function() {
                    $btn.prop('disabled', false).text('Sign In to Portal');
                    $alert.addClass('kt-alert-danger').text('Server error. Please try again.').show();
                });
            });

            // Open Change Super Admin Password Modal (Delegated Click)
            $(document).on('click', '#btn-open-change-pass-modal', function(e) {
                e.preventDefault();
                var u = self.getUserSession();
                $('#kt-change-password-form')[0].reset();
                $('#change-pass-username').val(u.user_login || 'saif');
                $('#change-pass-new, #change-pass-confirm').attr('type', 'password');
                $('.btn-toggle-pass').text('👁️');
                $('#kt-change-password-modal, #kt-modal-backdrop').show();
            });

            // Toggle Password Eye Visibility
            $(document).on('click', '.btn-toggle-pass', function(e) {
                e.preventDefault();
                var targetSel = $(this).data('target');
                var $input = $(targetSel);
                if ($input.length) {
                    if ($input.attr('type') === 'password') {
                        $input.attr('type', 'text');
                        $(this).text('🙈');
                    } else {
                        $input.attr('type', 'password');
                        $(this).text('👁️');
                    }
                }
            });

            // Change Password Form Submit
            $('#kt-change-password-form').on('submit', function(e) {
                e.preventDefault();
                var u = self.getUserSession();
                var data = $(this).serialize() + '&action=kt_change_superadmin_password&nonce=' + ktConfig.nonce + '&current_user_id=' + u.user_id + '&current_user_name=' + encodeURIComponent(u.display_name) + '&current_user_role=' + u.role_level;

                $.post(ktConfig.ajaxUrl, data, function(res) {
                    if (res.success) {
                        alert('✅ ' + res.data.message);
                        if (res.data.updated_user) {
                            localStorage.setItem('kt_user', JSON.stringify(res.data.updated_user));
                            self.updateHeaderUserInfo();
                        }
                        $('#kt-change-password-modal, #kt-modal-backdrop').hide();
                        self.loadAuditLogs();
                    } else {
                        alert('❌ ' + (res.data.message || 'Error updating password'));
                    }
                });
            });

            // Switch User / Logout Button
            $('#kt-logout-btn').on('click', function(e) {
                e.preventDefault();
                $('#kt-login-modal, #kt-modal-backdrop').show();
            });

            // Open Staff Registration Request Modal
            $('#btn-open-register-modal').on('click', function() {
                $('#kt-login-modal').hide();
                $('#kt-register-form')[0].reset();
                $('#kt-staff-register-modal, #kt-modal-backdrop').show();
            });

            // Submit Staff Registration Request Form
            $('#kt-register-form').on('submit', function(e) {
                e.preventDefault();
                var data = $(this).serialize() + '&action=kt_register_staff_request&nonce=' + ktConfig.nonce;
                $.post(ktConfig.ajaxUrl, data, function(res) {
                    if (res.success) {
                        alert('✅ ' + res.data.message);
                        $('#kt-staff-register-modal, #kt-modal-backdrop').hide();
                    } else {
                        alert(res.data.message || 'Error submitting registration request');
                    }
                });
            });
        },

        /* ==================== NAVIGATION & ROUTING ==================== */
        bindNavigation: function() {
            var self = this;

            $('#kt-drawer-toggle').on('click', function() {
                $('#kt-sidebar').toggleClass('active');
            });

            $('.nav-item').on('click', function(e) {
                e.preventDefault();
                var view = $(this).data('view');
                window.location.hash = view;
                self.switchView(view);
                $('#kt-sidebar').removeClass('active');
            });

            $(window).on('hashchange', function() {
                var hash = window.location.hash.replace('#', '') || 'dashboard';
                self.switchView(hash);
            });
        },

        switchView: function(viewName, targetFilter) {
            this.currentView = viewName;
            $('.nav-item').removeClass('active');
            $('.nav-item[data-view="' + viewName + '"]').addClass('active');

            $('#kt-view-loader').show();
            $('#kt-view-content').hide();

            switch (viewName) {
                case 'dashboard':
                    this.loadDashboardView();
                    break;
                case 'customers':
                    this.loadCustomersView(targetFilter);
                    break;
                case 'packages':
                    this.loadPackagesView();
                    break;
                case 'products':
                    this.loadProductsView();
                    break;
                case 'invoices':
                    this.loadInvoicesView(targetFilter);
                    break;
                case 'staff':
                    this.loadStaffView();
                    break;
                case 'logs':
                    this.loadLogsView();
                    break;
                default:
                    this.loadDashboardView();
                    break;
            }
        },

        /* ==================== REAL-TIME HEARTBEAT POLLING ==================== */
        startHeartbeat: function() {
            var self = this;
            if (this.pollingInterval) clearInterval(this.pollingInterval);

            this.pollingInterval = setInterval(function() {
                if (self.currentView === 'dashboard') {
                    self.fetchDashboardStats(true);
                } else if (self.currentView === 'customers') {
                    self.fetchCustomers();
                } else if (self.currentView === 'invoices') {
                    self.fetchInvoices();
                } else if (self.currentView === 'products') {
                    self.fetchProducts();
                }
            }, 6000); // 6-second real-time sync across all active views
        },

        /* ==================== 1. DASHBOARD VIEW ==================== */
        loadDashboardView: function() {
            var html = `
                <div class="section-header">
                    <div>
                        <h2 class="section-title">ISP Operation Metrics</h2>
                        <p style="font-size:12px; color: var(--text-muted);">Real-time status overview of Khan Telecom subscribers & revenue.</p>
                    </div>
                    <button id="btn-refresh-dash" class="btn btn-sm btn-secondary">🔄 Refresh</button>
                </div>

                <div class="metrics-grid">
                    <div class="metric-card metric-card-clickable" data-view="customers" data-filter="" title="Click to view All Subscribers">
                        <div class="metric-info">
                            <h3>Total Subscribers</h3>
                            <div id="dash-total-cust" class="metric-value">--</div>
                        </div>
                        <div class="metric-icon">👥</div>
                    </div>
                    <div class="metric-card metric-card-clickable" data-view="customers" data-filter="active" title="Click to view Active Subscribers">
                        <div class="metric-info">
                            <h3>Active Connections</h3>
                            <div id="dash-active-cust" class="metric-value" style="color:#7ee787;">--</div>
                        </div>
                        <div class="metric-icon">⚡</div>
                    </div>
                    <div class="metric-card metric-card-clickable" data-view="customers" data-filter="inactive" title="Click to view Inactive / Expired Subscribers">
                        <div class="metric-info">
                            <h3>Inactive Subscribers</h3>
                            <div id="dash-inactive-cust" class="metric-value" style="color:#ff7b72;">--</div>
                        </div>
                        <div class="metric-icon">🚫</div>
                    </div>
                    <div class="metric-card metric-card-clickable" data-view="invoices" data-filter="paid" title="Click to view Paid Revenue Invoices">
                        <div class="metric-info">
                            <h3>Monthly Revenue</h3>
                            <div id="dash-monthly-revenue" class="metric-value" style="color:#388bfd;">PKR --</div>
                        </div>
                        <div class="metric-icon">📈</div>
                    </div>
                    <div class="metric-card metric-card-clickable" data-view="invoices" data-filter="unpaid" title="Click to view Pending Dues">
                        <div class="metric-info">
                            <h3>Pending Dues</h3>
                            <div id="dash-pending-dues" class="metric-value" style="color:#ff7b72;">PKR --</div>
                        </div>
                        <div class="metric-icon">⚠️</div>
                    </div>
                    <div id="financial-profit-card" class="metric-card metric-card-clickable" data-view="packages" data-filter="" style="display:none; border-color: var(--accent);" title="Click to view ISP Packages">
                        <div class="metric-info">
                            <h3>Net Profit Margin</h3>
                            <div id="dash-net-profit" class="metric-value" style="color:#a371f7;">PKR --</div>
                        </div>
                        <div class="metric-icon">📊</div>
                    </div>
                </div>

                <div class="section-header">
                    <h3 style="font-size:16px;">Recent Fee Collections</h3>
                </div>
                <div class="kt-table-container">
                    <table class="kt-table">
                        <thead>
                            <tr>
                                <th>Invoice No</th>
                                <th>Subscriber</th>
                                <th>Amount Paid</th>
                                <th>Payment Method</th>
                                <th>Date & Time</th>
                            </tr>
                        </thead>
                        <tbody id="dash-recent-collections">
                        </tbody>
                    </table>
                </div>
            `;

            $('#kt-view-content').html(html).show();
            $('#kt-view-loader').hide();

            this.fetchDashboardStats(false);
        },

        fetchDashboardStats: function(silent) {
            $.post(ktConfig.ajaxUrl, { action: 'kt_get_dashboard_stats', nonce: ktConfig.nonce }, function(res) {
                if (res.success) {
                    var d = res.data;
                    $('#dash-total-cust').text(d.total_customers);
                    $('#dash-active-cust').text(d.active_customers);
                    $('#dash-inactive-cust').text(d.inactive_customers);
                    $('#dash-monthly-revenue').text('PKR ' + d.monthly_revenue);
                    $('#dash-pending-dues').text('PKR ' + d.pending_dues);

                    if (d.financials.can_view) {
                        $('#financial-profit-card').css('display', 'flex');
                        $('#dash-net-profit').text('PKR ' + d.financials.total_profit.toLocaleString('en-US', {minimumFractionDigits: 2}));
                    } else {
                        $('#financial-profit-card').hide();
                    }

                    var rows = '';
                    if (d.recent_collections && d.recent_collections.length > 0) {
                        d.recent_collections.forEach(function(item) {
                            rows += `
                                <tr>
                                    <td><strong>${item.invoice_number}</strong></td>
                                    <td>${item.full_name} (${item.customer_code})</td>
                                    <td style="color:#7ee787; font-weight:bold;">PKR ${parseFloat(item.amount_paid).toFixed(2)}</td>
                                    <td>${item.payment_method.toUpperCase().replace('_', ' ')}</td>
                                    <td>${item.paid_at || item.created_at}</td>
                                </tr>
                            `;
                        });
                    } else {
                        rows = '<tr><td colspan="5" style="text-align:center; color: var(--text-muted);">No recent payment settlements recorded today.</td></tr>';
                    }
                    $('#dash-recent-collections').html(rows);
                }
            });
        },

        /* ==================== 2. CUSTOMERS VIEW ==================== */
        loadCustomersView: function(targetFilter) {
            targetFilter = (targetFilter !== undefined && targetFilter !== null) ? String(targetFilter) : '';

            var html = `
                <div class="section-header">
                    <div>
                        <h2 class="section-title">Subscribers Directory</h2>
                        <p style="font-size:12px; color: var(--text-muted);">Manage 30-Day subscriber package cycles, assigned IPs, and active/inactive status.</p>
                    </div>
                    <button id="btn-add-customer" class="btn btn-primary">➕ Register New Subscriber</button>
                </div>

                <div class="status-tab-bar" style="display:flex; gap:10px; margin-bottom: 16px; flex-wrap:wrap; align-items:center;">
                    <button class="btn btn-sm ${targetFilter === '' ? 'btn-primary active' : 'btn-secondary'} btn-status-pill" data-status="">📋 All Subscribers (<span id="count-total">0</span>)</button>
                    <button class="btn btn-sm ${targetFilter === 'active' ? 'btn-success active' : 'btn-secondary'} btn-status-pill" data-status="active">🟢 Active Packages (<span id="count-active">0</span>)</button>
                    <button class="btn btn-sm ${targetFilter === 'inactive' ? 'btn-outline-danger active' : 'btn-secondary'} btn-status-pill" data-status="inactive">🔴 Inactive / Expired (<span id="count-inactive">0</span>)</button>
                </div>

                <div class="filter-bar" style="margin-bottom: 16px;">
                    <input type="text" id="cust-search-input" placeholder="Search by Name, Code, Phone, Sector..." style="flex:1; max-width:300px;">
                    <select id="cust-status-filter" style="width:200px;">
                        <option value="" ${targetFilter === '' ? 'selected' : ''}>All Statuses</option>
                        <option value="active" ${targetFilter === 'active' ? 'selected' : ''}>Active (Within 30 Days)</option>
                        <option value="inactive" ${targetFilter === 'inactive' ? 'selected' : ''}>Inactive (Expired / Suspended)</option>
                    </select>
                    <button id="btn-filter-customers" class="btn btn-secondary">Filter</button>
                </div>

                <div class="kt-table-container">
                    <table class="kt-table">
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Full Name</th>
                                <th>Phone / Sector</th>
                                <th>Package Tier</th>
                                <th>Assigned IP</th>
                                <th>Status / Validity</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="cust-table-body">
                        </tbody>
                    </table>
                </div>
            `;

            $('#kt-view-loader').hide();
            $('#kt-view-content').html(html).show();

            this.fetchCustomers();
        },

        fetchCustomers: function() {
            var search = $('#cust-search-input').val();
            var status = $('#cust-status-filter').val();

            $.post(ktConfig.ajaxUrl, {
                action: 'kt_get_customers',
                nonce: ktConfig.nonce,
                search: search,
                status: status
            }, function(res) {
                if (res.success) {
                    if (res.data.counts) {
                        $('#count-total').text(res.data.counts.total);
                        $('#count-active').text(res.data.counts.active);
                        $('#count-inactive').text(res.data.counts.inactive);
                    }

                    var rows = '';
                    if (res.data.customers.length > 0) {
                        res.data.customers.forEach(function(c) {
                            var statusBadge = '';
                            var alertBtn = '';
                            if (c.status === 'active') {
                                statusBadge = `<span class="badge badge-active">🟢 Active (${c.days_remaining}d Left)</span><br><small style="color:var(--text-muted); font-size:10px;">Expires: ${c.expiry_date || 'N/A'}</small>`;
                            } else {
                                var reason = (c.status === 'expired') ? '30-Day Expired' : c.status.toUpperCase();
                                statusBadge = `<span class="badge badge-suspended">🔴 Inactive (${reason})</span><br><small style="color:#ff7b72; font-size:10px;">Package Expired</small>`;

                                var cleanPhone = (c.phone_number || '').replace(/^0/, '92');
                                var alertTextRaw = `🚨 *KHAN TELECOM PACKAGE EXPIRY ALERT* 🚨\n----------------------------------\nDear Subscriber: *${c.full_name}*\nSubscriber ID: *${c.customer_code}*\nArea/Sector: *${c.area_sector}*\n\n⚠️ Your 30-Day Broadband Package (*${c.package_name || 'Fiber Internet'}*) has *EXPIRED*.\nYour internet service status is currently: *INACTIVE / EXPIRED*.\n\n💡 Please renew your monthly package fee to continue enjoying high-speed internet service.\n==================================\nContact Khan Telecom Office for instant renewal.\n*D & D By Saif*`;
                                var waAlertUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(alertTextRaw)}`;

                                alertBtn = `<a href="${waAlertUrl}" target="_blank" class="btn btn-sm btn-whatsapp btn-send-alert-wa" title="Send WhatsApp Package Expiry Alert">🚨 WhatsApp Alert</a>`;
                            }

                            rows += `
                                <tr>
                                    <td><strong>${c.customer_code}</strong></td>
                                    <td>${c.full_name}<br><small style="color:var(--text-muted);">${c.cnic_id || 'No CNIC'}</small></td>
                                    <td>${c.phone_number}<br><small style="color:var(--text-muted);">${c.area_sector}</small></td>
                                    <td>${c.package_name || 'N/A'}</td>
                                    <td><code>${c.assigned_ip_ipoe || 'Unassigned'}</code></td>
                                    <td>${statusBadge}</td>
                                    <td>
                                        <div class="action-btn-group">
                                            <button class="btn btn-sm btn-secondary btn-edit-customer" data-json='${JSON.stringify(c)}'>✏️ Edit</button>
                                            <button class="btn btn-sm btn-primary btn-view-ledger" data-id="${c.id}">📜 Ledger</button>
                                            ${alertBtn}
                                            <button class="btn btn-sm btn-outline-danger btn-delete-customer" data-id="${c.id}" data-name="${c.full_name}">🗑️ Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            `;
                        });
                    } else {
                        rows = '<tr><td colspan="7" style="text-align:center; color: var(--text-muted);">No subscribers match search filter.</td></tr>';
                    }
                    $('#cust-table-body').html(rows);
                }
            });
        },

        /* ==================== 3. PACKAGES VIEW ==================== */
        loadPackagesView: function() {
            var html = `
                <div class="section-header">
                    <div>
                        <h2 class="section-title">ISP Internet Packages</h2>
                        <p style="font-size:12px; color: var(--text-muted);">Define bandwidth speeds, wholesale cost prices, and retail pricing.</p>
                    </div>
                    <button id="btn-add-package" class="btn btn-primary">➕ Create New Package</button>
                </div>

                <div class="kt-table-container">
                    <table class="kt-table">
                        <thead>
                            <tr>
                                <th>Package Name</th>
                                <th>Speed (Mbps)</th>
                                <th>Wholesale Cost</th>
                                <th>Retail Sale Price</th>
                                <th>Profit Margin</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="pkg-table-body">
                        </tbody>
                    </table>
                </div>
            `;

            $('#kt-view-content').html(html).show();
            $('#kt-view-loader').hide();

            this.fetchPackages();
        },

        fetchPackages: function() {
            $.post(ktConfig.ajaxUrl, { action: 'kt_get_packages', nonce: ktConfig.nonce }, function(res) {
                if (res.success) {
                    var rows = '';
                    var canEdit = res.data.can_edit;
                    if (!canEdit) $('#btn-add-package').hide();

                    res.data.packages.forEach(function(p) {
                        var costDisplay = (p.cost_price !== undefined) ? 'PKR ' + parseFloat(p.cost_price).toFixed(2) : '<span style="color:var(--text-muted);">[Restricted]</span>';
                        var marginDisplay = (p.margin !== undefined) ? '<strong style="color:#7ee787;">PKR ' + parseFloat(p.margin).toFixed(2) + '</strong>' : '<span style="color:var(--text-muted);">[Restricted]</span>';

                        rows += `
                            <tr>
                                <td><strong>${p.package_name}</strong></td>
                                <td>${p.speed_mbps} Mbps</td>
                                <td>${costDisplay}</td>
                                <td style="font-weight:bold;">PKR ${parseFloat(p.sale_price).toFixed(2)}</td>
                                <td>${marginDisplay}</td>
                                <td><span class="badge badge-${p.status}">${p.status}</span></td>
                                <td>
                                    ${canEdit ? `<button class="btn btn-sm btn-secondary btn-edit-package" data-json='${JSON.stringify(p)}'>✏️ Edit</button>` : 'N/A'}
                                </td>
                            </tr>
                        `;
                    });
                    $('#pkg-table-body').html(rows);
                }
            });
        },

        /* ==================== 3.5 PRODUCTS & STOCK INVENTORY VIEW ==================== */
        loadProductsView: function() {
            var html = `
                <div class="section-header">
                    <div>
                        <h2 class="section-title">Hardware Inventory & Stock Buying</h2>
                        <p style="font-size:12px; color: var(--text-muted);">Manage routers, fiber cables, connectors, and equipment sales to subscribers.</p>
                    </div>
                    <div style="display:flex; gap:10px;">
                        <button id="btn-add-product" class="btn btn-primary">➕ Buy / Add Stock Entry</button>
                        <button id="btn-sell-product-modal-open" class="btn btn-success">🛒 Sell Hardware to Subscriber</button>
                    </div>
                </div>

                <div class="kt-table-container">
                    <table class="kt-table">
                        <thead>
                            <tr>
                                <th>Product Name</th>
                                <th>Category</th>
                                <th>Stock Qty</th>
                                <th>Wholesale Cost</th>
                                <th>Retail Sale Price</th>
                                <th>Profit / Unit</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="prod-table-body">
                        </tbody>
                    </table>
                </div>
            `;

            $('#kt-view-content').html(html).show();
            $('#kt-view-loader').hide();

            this.fetchProducts();
        },

        fetchProducts: function() {
            var self = this;
            $.post(ktConfig.ajaxUrl, { action: 'kt_get_products', nonce: ktConfig.nonce }, function(res) {
                if (res.success) {
                    var rows = '';
                    var products = res.data.products;
                    self.productsList = products; // Cache for live calculator

                    if (products.length > 0) {
                        products.forEach(function(p) {
                            var costDisplay = (p.cost_price !== undefined) ? 'PKR ' + parseFloat(p.cost_price).toFixed(2) : '<span style="color:var(--text-muted);">[Restricted]</span>';
                            var marginDisplay = (p.margin !== undefined) ? '<strong style="color:#7ee787;">PKR ' + parseFloat(p.margin).toFixed(2) + '</strong>' : '<span style="color:var(--text-muted);">[Restricted]</span>';
                            var stockBadge = p.stock_qty > 5 ? `<span class="badge badge-active">${p.stock_qty} ${p.unit}</span>` : `<span class="badge badge-suspended">${p.stock_qty} ${p.unit} (Low)</span>`;

                            rows += `
                                <tr>
                                    <td><strong>${p.product_name}</strong></td>
                                    <td><span class="badge badge-pending">${p.category}</span></td>
                                    <td>${stockBadge}</td>
                                    <td>${costDisplay}</td>
                                    <td style="font-weight:bold;">PKR ${parseFloat(p.sale_price).toFixed(2)}</td>
                                    <td>${marginDisplay}</td>
                                    <td>
                                        <div class="action-btn-group">
                                            <button class="btn btn-sm btn-secondary btn-edit-product" data-json='${JSON.stringify(p)}'>✏️ Edit</button>
                                            <button class="btn btn-sm btn-whatsapp btn-sell-product-row" data-id="${p.id}" data-name="${p.product_name}" data-price="${p.sale_price}">📱 Sell & WhatsApp</button>
                                            <button class="btn btn-sm btn-outline-danger btn-delete-product" data-id="${p.id}" data-name="${p.product_name}">🗑️ Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            `;
                        });
                    } else {
                        rows = '<tr><td colspan="7" style="text-align:center; color: var(--text-muted);">No hardware inventory products found.</td></tr>';
                    }
                    $('#prod-table-body').html(rows);

                    // Update sell product dropdown
                    var selectOpts = '<option value="">-- Select Hardware Product --</option>';
                    products.forEach(function(p) {
                        selectOpts += `<option value="${p.id}" data-price="${p.sale_price}">${p.product_name} (Stock: ${p.stock_qty} ${p.unit} - PKR ${p.sale_price})</option>`;
                    });
                    $('#sell-product-select').html(selectOpts);
                }
            });
        },

        /* ==================== 4. INVOICES & RECOVERY VIEW ==================== */
        loadInvoicesView: function(targetFilter) {
            targetFilter = (targetFilter !== undefined && targetFilter !== null) ? String(targetFilter) : '';

            var html = `
                <div class="section-header">
                    <div>
                        <h2 class="section-title">Invoices & Field Fee Recovery</h2>
                        <p style="font-size:12px; color: var(--text-muted);">Generate billing slips, collect payments, and dispatch WhatsApp receipts.</p>
                    </div>
                    <button id="btn-create-invoice" class="btn btn-primary">📄 Generate Invoice</button>
                </div>

                <div class="filter-bar" style="margin-bottom: 16px;">
                    <input type="text" id="inv-search-input" placeholder="Search Invoice No, Subscriber Code/Name..." style="flex:1; max-width:300px;">
                    <select id="inv-status-filter" style="width:160px;">
                        <option value="" ${targetFilter === '' ? 'selected' : ''}>All Payments</option>
                        <option value="unpaid" ${targetFilter === 'unpaid' ? 'selected' : ''}>Unpaid</option>
                        <option value="paid" ${targetFilter === 'paid' ? 'selected' : ''}>Paid</option>
                        <option value="partial" ${targetFilter === 'partial' ? 'selected' : ''}>Partial</option>
                    </select>
                    <button id="btn-filter-invoices" class="btn btn-secondary">Filter</button>
                </div>

                <div class="kt-table-container">
                    <table class="kt-table">
                        <thead>
                            <tr>
                                <th>Invoice No</th>
                                <th>Subscriber</th>
                                <th>Month</th>
                                <th>Amount Due</th>
                                <th>Amount Paid</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="inv-table-body">
                        </tbody>
                    </table>
                </div>
            `;

            $('#kt-view-content').html(html).show();
            $('#kt-view-loader').hide();

            this.fetchInvoices();
        },

        fetchInvoices: function() {
            var search = $('#inv-search-input').val();
            var status = $('#inv-status-filter').val();

            $.post(ktConfig.ajaxUrl, {
                action: 'kt_get_invoices',
                nonce: ktConfig.nonce,
                search: search,
                status: status
            }, function(res) {
                if (res.success) {
                    var rows = '';
                    if (res.data.invoices.length > 0) {
                        res.data.invoices.forEach(function(inv) {
                            var statusBadge = `<span class="badge badge-${inv.payment_status}">${inv.payment_status}</span>`;
                            var isPaid = (inv.payment_status === 'paid');

                            rows += `
                                <tr>
                                    <td><strong>${inv.invoice_number}</strong></td>
                                    <td>${inv.full_name}<br><small style="color:var(--text-muted);">${inv.customer_code} | ${inv.phone_number}</small></td>
                                    <td>${inv.billing_month}</td>
                                    <td>PKR ${parseFloat(inv.amount_due).toFixed(2)}</td>
                                    <td style="color:${isPaid ? '#7ee787' : '#ff7b72'}; font-weight:bold;">PKR ${parseFloat(inv.amount_paid).toFixed(2)}</td>
                                    <td>${statusBadge}</td>
                                    <td>
                                        <div class="action-btn-group">
                                            ${!isPaid ? `<button class="btn btn-sm btn-success btn-collect-pay" data-id="${inv.id}" data-name="${inv.full_name}" data-due="${inv.amount_due}">💰 Collect Fee</button>` : ''}
                                            ${isPaid ? `<button class="btn btn-sm btn-primary btn-view-receipt" data-id="${inv.id}">🧾 Slip & WhatsApp</button>` : ''}
                                            <button class="btn btn-sm btn-secondary btn-toggle-inv-status" data-id="${inv.id}" data-status="${isPaid ? 'unpaid' : 'paid'}" title="Toggle Payment Status">${isPaid ? '↩️ Mark Unpaid' : '✅ Mark Paid'}</button>
                                            <button class="btn btn-sm btn-outline-danger btn-delete-invoice" data-id="${inv.id}" data-no="${inv.invoice_number}" title="Delete Invoice">🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            `;
                        });
                    } else {
                        rows = '<tr><td colspan="7" style="text-align:center; color: var(--text-muted);">No invoices match search filter.</td></tr>';
                    }
                    $('#inv-table-body').html(rows);
                }
            });
        },

        /* ==================== 5. STAFF MATRIX VIEW ==================== */
        loadStaffView: function() {
            var html = `
                <div class="section-header">
                    <div>
                        <h2 class="section-title">Staff Permission Matrix & Approval</h2>
                        <p style="font-size:12px; color: var(--text-muted);">Grant fine-grained capabilities to field recovery agents and administrators.</p>
                    </div>
                </div>

                <div class="kt-table-container">
                    <table class="kt-table">
                        <thead>
                            <tr>
                                <th>Staff Member</th>
                                <th>Role Level</th>
                                <th>Financials View</th>
                                <th>Customers</th>
                                <th>Invoices</th>
                                <th>Collections</th>
                                <th>Approval Status</th>
                                <th>Save</th>
                            </tr>
                        </thead>
                        <tbody id="staff-table-body">
                        </tbody>
                    </table>
                </div>
            `;

            $('#kt-view-content').html(html).show();
            $('#kt-view-loader').hide();

            this.fetchStaffMatrix();
        },

        fetchStaffMatrix: function() {
            $.post(ktConfig.ajaxUrl, { action: 'kt_get_employee_matrix', nonce: ktConfig.nonce }, function(res) {
                if (res.success) {
                    var rows = '';
                    res.data.matrix.forEach(function(item) {
                        var p = item.permissions;
                        rows += `
                            <tr data-user-id="${item.user_id}">
                                <td><strong>${item.display_name}</strong><br><small style="color:var(--text-muted);">${item.user_email}</small></td>
                                <td>
                                    <select class="staff-role-select" style="padding:4px; font-size:12px;">
                                        <option value="super_admin" ${p.role_level === 'super_admin' ? 'selected' : ''}>Super Admin</option>
                                        <option value="admin" ${p.role_level === 'admin' ? 'selected' : ''}>Admin</option>
                                        <option value="employee" ${p.role_level === 'employee' ? 'selected' : ''}>Field Employee</option>
                                    </select>
                                </td>
                                <td><input type="checkbox" class="chk-financials" ${p.can_view_financials == 1 ? 'checked' : ''}></td>
                                <td><input type="checkbox" class="chk-customers" ${p.can_manage_customers == 1 ? 'checked' : ''}></td>
                                <td><input type="checkbox" class="chk-invoices" ${p.can_create_invoice == 1 ? 'checked' : ''}></td>
                                <td><input type="checkbox" class="chk-collections" ${p.can_collect_payment == 1 ? 'checked' : ''}></td>
                                <td>
                                    <select class="staff-approval-select" style="padding:4px; font-size:12px;">
                                        <option value="approved" ${p.approval_status === 'approved' ? 'selected' : ''}>Approved</option>
                                        <option value="pending_approval" ${p.approval_status === 'pending_approval' ? 'selected' : ''}>Pending</option>
                                        <option value="revoked" ${p.approval_status === 'revoked' ? 'selected' : ''}>Revoked</option>
                                    </select>
                                </td>
                                <td>
                                    <button class="btn btn-sm btn-primary btn-save-staff-perm">💾 Save</button>
                                </td>
                            </tr>
                        `;
                    });
                    $('#staff-table-body').html(rows);
                }
            });
        },

        /* ==================== MODALS & ACTIONS BINDING ==================== */
        bindModals: function() {
            var self = this;

            $('.modal-close, #kt-modal-backdrop').on('click', function() {
                $('.kt-modal, #kt-modal-backdrop').hide();
            });

            // Populate Customer Select Options in Modals
            this.populateCustomerAndPackageSelects();
        },

        populateCustomerAndPackageSelects: function() {
            $.post(ktConfig.ajaxUrl, { action: 'kt_get_packages', nonce: ktConfig.nonce }, function(res) {
                if (res.success) {
                    var opts = '<option value="">-- Select Package --</option>';
                    res.data.packages.forEach(function(p) {
                        opts += `<option value="${p.id}">${p.package_name} (${p.speed_mbps} Mbps - PKR ${p.sale_price})</option>`;
                    });
                    $('#cust-package-select').html(opts);
                }
            });

            $.post(ktConfig.ajaxUrl, { action: 'kt_get_customers', nonce: ktConfig.nonce }, function(res) {
                if (res.success) {
                    var opts = '<option value="">-- Select Subscriber --</option>';
                    res.data.customers.forEach(function(c) {
                        opts += `<option value="${c.id}">${c.customer_code} - ${c.full_name} (${c.area_sector})</option>`;
                    });
                    $('#invoice-customer-select').html(opts);
                }
            });
        },

        bindCalculators: function() {
            // Package Profit Margin Live Calculator
            $('#pkg-cost, #pkg-sale').on('input', function() {
                var cost = parseFloat($('#pkg-cost').val()) || 0;
                var sale = parseFloat($('#pkg-sale').val()) || 0;
                var margin = Math.max(0, sale - cost);
                $('#pkg-margin-preview').text('PKR ' + margin.toFixed(2));
            });
        },

        bindActions: function() {
            var self = this;

            // 1. Add / Edit Customer Form Submit
            $(document).on('click', '#btn-add-customer', function() {
                $('#kt-customer-form')[0].reset();
                $('#kt-customer-form input[name="id"]').val(0);
                $('#kt-customer-form input[name="customer_code"]').val('KT-' + Math.floor(1001 + Math.random() * 9000));
                $('#customer-modal-title').text('Register New Subscriber');
                $('#btn-delete-customer-modal').hide();
                $('#kt-customer-modal, #kt-modal-backdrop').show();
            });

            $(document).on('click', '.btn-edit-customer', function() {
                var data = $(this).data('json');
                $('#kt-customer-form input[name="id"]').val(data.id);
                $('#kt-customer-form input[name="customer_code"]').val(data.customer_code);
                $('#kt-customer-form input[name="full_name"]').val(data.full_name);
                $('#kt-customer-form input[name="phone_number"]').val(data.phone_number);
                $('#kt-customer-form input[name="cnic_id"]').val(data.cnic_id);
                $('#kt-customer-form input[name="area_sector"]').val(data.area_sector);
                $('#kt-customer-form textarea[name="address"]').val(data.address);
                $('#kt-customer-form select[name="package_id"]').val(data.package_id);
                $('#kt-customer-form input[name="assigned_ip_ipoe"]').val(data.assigned_ip_ipoe);
                $('#kt-customer-form select[name="connection_type"]').val(data.connection_type);
                $('#kt-customer-form input[name="billing_cycle_day"]').val(data.billing_cycle_day);
                $('#kt-customer-form select[name="status"]').val(data.status);

                $('#customer-modal-title').text('Edit Subscriber Profile (' + data.customer_code + ')');
                $('#btn-delete-customer-modal').show();
                $('#kt-customer-modal, #kt-modal-backdrop').show();
            });

            // Delete Subscriber from Modal Footer
            $(document).on('click', '#btn-delete-customer-modal', function() {
                var id = $('#kt-customer-form input[name="id"]').val();
                var name = $('#kt-customer-form input[name="full_name"]').val();
                if (id > 0 && confirm('Are you sure you want to delete subscriber profile: ' + name + '?')) {
                    var u = self.getUserSession();
                    $.post(ktConfig.ajaxUrl, { action: 'kt_delete_customer', nonce: ktConfig.nonce, customer_id: id, current_user_id: u.user_id, current_user_name: encodeURIComponent(u.display_name), current_user_role: u.role_level }, function(res) {
                        if (res.success) {
                            alert('✅ ' + res.data.message);
                            $('#kt-customer-modal, #kt-modal-backdrop').hide();
                            self.fetchCustomers();
                            self.populateCustomerAndPackageSelects();
                            self.fetchDashboardStats(true);
                        } else {
                            alert(res.data.message || 'Error deleting customer');
                        }
                    });
                }
            });

            // Delete Subscriber from Table Row
            $(document).on('click', '.btn-delete-customer', function() {
                var id = $(this).data('id');
                var name = $(this).data('name');
                if (confirm('Are you sure you want to delete subscriber profile: ' + name + '?')) {
                    var u = self.getUserSession();
                    $.post(ktConfig.ajaxUrl, { action: 'kt_delete_customer', nonce: ktConfig.nonce, customer_id: id, current_user_id: u.user_id, current_user_name: encodeURIComponent(u.display_name), current_user_role: u.role_level }, function(res) {
                        if (res.success) {
                            alert('✅ ' + res.data.message);
                            self.fetchCustomers();
                            self.populateCustomerAndPackageSelects();
                            self.fetchDashboardStats(true);
                        } else {
                            alert(res.data.message || 'Error deleting customer');
                        }
                    });
                }
            });

            $('#kt-customer-form').on('submit', function(e) {
                e.preventDefault();
                var user = self.getUserSession();
                var data = $(this).serialize() + '&action=kt_save_customer&nonce=' + ktConfig.nonce + '&current_user_id=' + user.user_id + '&current_user_name=' + encodeURIComponent(user.display_name) + '&current_user_role=' + user.role_level;
                $.post(ktConfig.ajaxUrl, data, function(res) {
                    if (res.success) {
                        alert(res.data.message);
                        $('#kt-customer-modal, #kt-modal-backdrop').hide();
                        self.fetchCustomers();
                        self.populateCustomerAndPackageSelects();
                        self.fetchDashboardStats(true);
                    } else {
                        alert(res.data.message || 'Error saving customer');
                    }
                });
            });

            // 2. Add / Edit Package Form Submit
            $(document).on('click', '#btn-add-package', function() {
                $('#kt-package-form')[0].reset();
                $('#kt-package-form input[name="id"]').val(0);
                $('#package-modal-title').text('Create Package Tier');
                $('#pkg-margin-preview').text('PKR 1000.00');
                $('#kt-package-modal, #kt-modal-backdrop').show();
            });

            $(document).on('click', '.btn-edit-package', function() {
                var p = $(this).data('json');
                $('#kt-package-form input[name="id"]').val(p.id);
                $('#kt-package-form input[name="package_name"]').val(p.package_name);
                $('#kt-package-form input[name="speed_mbps"]').val(p.speed_mbps);
                $('#kt-package-form input[name="cost_price"]').val(p.cost_price || 0);
                $('#kt-package-form input[name="sale_price"]').val(p.sale_price);
                $('#kt-package-form select[name="status"]').val(p.status);

                var margin = Math.max(0, parseFloat(p.sale_price) - parseFloat(p.cost_price || 0));
                $('#pkg-margin-preview').text('PKR ' + margin.toFixed(2));

                $('#package-modal-title').text('Edit Package Tier');
                $('#kt-package-modal, #kt-modal-backdrop').show();
            });

            $('#kt-package-form').on('submit', function(e) {
                e.preventDefault();
                var user = self.getUserSession();
                var data = $(this).serialize() + '&action=kt_save_package&nonce=' + ktConfig.nonce + '&current_user_id=' + user.user_id + '&current_user_name=' + encodeURIComponent(user.display_name) + '&current_user_role=' + user.role_level;
                $.post(ktConfig.ajaxUrl, data, function(res) {
                    if (res.success) {
                        alert(res.data.message);
                        $('#kt-package-modal, #kt-modal-backdrop').hide();
                        self.fetchPackages();
                        self.populateCustomerAndPackageSelects();
                        self.fetchDashboardStats(true);
                    } else {
                        alert(res.data.message || 'Error saving package');
                    }
                });
            });

            // 2.5 Product Buying Stock & Hardware Selling Actions
            $(document).on('click', '#btn-add-product', function() {
                $('#kt-product-form')[0].reset();
                $('#kt-product-form input[name="id"]').val(0);
                $('#product-modal-title').text('Buy / Add Hardware Product Stock');
                $('#kt-product-modal, #kt-modal-backdrop').show();
            });

            $(document).on('click', '.btn-edit-product', function() {
                var p = $(this).data('json');
                $('#kt-product-form input[name="id"]').val(p.id);
                $('#kt-product-form input[name="product_name"]').val(p.product_name);
                $('#kt-product-form select[name="category"]').val(p.category);
                $('#kt-product-form input[name="unit"]').val(p.unit);
                $('#kt-product-form input[name="cost_price"]').val(p.cost_price || 0);
                $('#kt-product-form input[name="sale_price"]').val(p.sale_price);
                $('#kt-product-form input[name="stock_qty"]').val(p.stock_qty);

                $('#product-modal-title').text('Edit Inventory Stock Entry');
                $('#kt-product-modal, #kt-modal-backdrop').show();
            });

            // Delete Hardware Product
            $(document).on('click', '.btn-delete-product', function() {
                var id = $(this).data('id');
                var name = $(this).data('name');
                if (confirm('Are you sure you want to delete hardware product: ' + name + '?')) {
                    var u = self.getUserSession();
                    $.post(ktConfig.ajaxUrl, { action: 'kt_delete_product', nonce: ktConfig.nonce, product_id: id, current_user_id: u.user_id, current_user_name: encodeURIComponent(u.display_name), current_user_role: u.role_level }, function(res) {
                        if (res.success) {
                            alert('✅ ' + res.data.message);
                            self.fetchProducts();
                            self.fetchDashboardStats(true);
                        } else {
                            alert(res.data.message || 'Error deleting product');
                        }
                    });
                }
            });

            $('#kt-product-form').on('submit', function(e) {
                e.preventDefault();
                var user = self.getUserSession();
                var data = $(this).serialize() + '&action=kt_save_product&nonce=' + ktConfig.nonce + '&current_user_id=' + user.user_id + '&current_user_name=' + encodeURIComponent(user.display_name) + '&current_user_role=' + user.role_level;
                $.post(ktConfig.ajaxUrl, data, function(res) {
                    if (res.success) {
                        alert('✅ Stock Entry Completed OK!\n\n' + res.data.message);
                        $('#kt-product-modal, #kt-modal-backdrop').hide();
                        self.fetchProducts();
                        self.fetchDashboardStats(true);
                    } else {
                        alert(res.data.message || 'Error saving product');
                    }
                });
            });

            // Open Sell Hardware Modal & Populate Dropdowns
            $(document).on('click', '#btn-sell-product-modal-open', function() {
                self.fetchProducts();
                self.populateCustomerAndPackageSelects();

                // Populate sell customer dropdown
                $.post(ktConfig.ajaxUrl, { action: 'kt_get_customers', nonce: ktConfig.nonce }, function(res) {
                    if (res.success) {
                        var opts = '<option value="">-- Select Subscriber --</option>';
                        res.data.customers.forEach(function(c) {
                            opts += `<option value="${c.id}">${c.customer_code} - ${c.full_name} (${c.area_sector})</option>`;
                        });
                        $('#sell-customer-select').html(opts);
                    }
                });

                $('#kt-sell-product-modal, #kt-modal-backdrop').show();
            });

            // Quick Sell Product & WhatsApp Receipt from Product Table Row
            $(document).on('click', '.btn-sell-product-row', function() {
                var prodId = $(this).data('id');
                self.fetchProducts();
                self.populateCustomerAndPackageSelects();

                $.post(ktConfig.ajaxUrl, { action: 'kt_get_customers', nonce: ktConfig.nonce }, function(res) {
                    if (res.success) {
                        var opts = '<option value="">-- Select Subscriber --</option>';
                        res.data.customers.forEach(function(c) {
                            opts += `<option value="${c.id}">${c.customer_code} - ${c.full_name} (${c.area_sector})</option>`;
                        });
                        $('#sell-customer-select').html(opts);
                    }
                    $('#sell-product-select').val(prodId).trigger('change');
                    $('#kt-sell-product-modal, #kt-modal-backdrop').show();
                });
            });

            // Hardware Sale Live Auto-Price Calculator
            $('#sell-product-select, #sell-qty-input').on('change input', function() {
                var $opt = $('#sell-product-select option:selected');
                var unitPrice = parseFloat($opt.data('price')) || 0;
                var qty = parseInt($('#sell-qty-input').val()) || 1;
                var total = unitPrice * qty;

                $('#sell-unit-price').val('PKR ' + unitPrice.toFixed(2));
                $('#sell-total-preview').text('PKR ' + total.toFixed(2));
            });

            $('#kt-sell-product-form').on('submit', function(e) {
                e.preventDefault();
                var user = self.getUserSession();
                var data = $(this).serialize() + '&action=kt_sell_product&nonce=' + ktConfig.nonce + '&current_user_id=' + user.user_id + '&current_user_name=' + encodeURIComponent(user.display_name) + '&current_user_role=' + user.role_level;
                $.post(ktConfig.ajaxUrl, data, function(res) {
                    if (res.success) {
                        $('#kt-sell-product-modal').hide();
                        self.fetchProducts();
                        self.fetchDashboardStats(true);
                        self.openReceiptModal(res.data.sale_id, 'sale');
                    } else {
                        alert(res.data.message || 'Error processing hardware sale');
                    }
                });
            });

            // 3. Create Invoice Modal
            $(document).on('click', '#btn-create-invoice', function() {
                self.populateCustomerAndPackageSelects();
                $('#kt-invoice-modal, #kt-modal-backdrop').show();
            });

            $('#kt-invoice-form').on('submit', function(e) {
                e.preventDefault();
                var user = self.getUserSession();
                var data = $(this).serialize() + '&action=kt_create_invoice&nonce=' + ktConfig.nonce + '&current_user_id=' + user.user_id + '&current_user_name=' + encodeURIComponent(user.display_name) + '&current_user_role=' + user.role_level;
                $.post(ktConfig.ajaxUrl, data, function(res) {
                    if (res.success) {
                        alert(res.data.message);
                        $('#kt-invoice-modal, #kt-modal-backdrop').hide();
                        self.fetchInvoices();
                        self.fetchDashboardStats(true);
                    } else {
                        alert(res.data.message || 'Error creating invoice');
                    }
                });
            });

            // Delete Invoice
            $(document).on('click', '.btn-delete-invoice', function() {
                var id = $(this).data('id');
                var invNo = $(this).data('no');
                if (confirm('Are you sure you want to delete invoice: ' + invNo + '?')) {
                    var u = self.getUserSession();
                    $.post(ktConfig.ajaxUrl, { action: 'kt_delete_invoice', nonce: ktConfig.nonce, invoice_id: id, current_user_id: u.user_id, current_user_name: encodeURIComponent(u.display_name), current_user_role: u.role_level }, function(res) {
                        if (res.success) {
                            alert('✅ ' + res.data.message);
                            self.fetchInvoices();
                            self.fetchDashboardStats(true);
                        } else {
                            alert(res.data.message || 'Error deleting invoice');
                        }
                    });
                }
            });

            // Toggle Invoice Payment Status (Paid / Unpaid)
            $(document).on('click', '.btn-toggle-inv-status', function() {
                var id = $(this).data('id');
                var newStatus = $(this).data('status');
                var u = self.getUserSession();
                $.post(ktConfig.ajaxUrl, { action: 'kt_toggle_invoice_status', nonce: ktConfig.nonce, invoice_id: id, status: newStatus, current_user_id: u.user_id, current_user_name: encodeURIComponent(u.display_name), current_user_role: u.role_level }, function(res) {
                    if (res.success) {
                        self.fetchInvoices();
                        self.fetchDashboardStats(true);
                    } else {
                        alert(res.data.message || 'Error toggling invoice status');
                    }
                });
            });

            // 4. Collect Fee Payment Modal
            $(document).on('click', '.btn-collect-pay', function() {
                var invId = $(this).data('id');
                var name = $(this).data('name');
                var due = $(this).data('due');

                $('#pay-invoice-id').val(invId);
                $('#pay-customer-name').text('Subscriber: ' + name);
                $('#pay-due-amount').text('Amount Due: PKR ' + parseFloat(due).toFixed(2));
                $('#pay-amount-input').val(due);

                $('#kt-payment-modal, #kt-modal-backdrop').show();
            });

            $('#kt-payment-form').on('submit', function(e) {
                e.preventDefault();
                var user = self.getUserSession();
                var data = $(this).serialize() + '&action=kt_collect_payment&nonce=' + ktConfig.nonce + '&current_user_id=' + user.user_id + '&current_user_name=' + encodeURIComponent(user.display_name) + '&current_user_role=' + user.role_level;
                $.post(ktConfig.ajaxUrl, data, function(res) {
                    if (res.success) {
                        $('#kt-payment-modal').hide();
                        self.fetchInvoices();
                        self.fetchDashboardStats(true);
                        self.openReceiptModal(res.data.invoice_id, 'invoice');
                    } else {
                        alert(res.data.message || 'Error recording payment');
                    }
                });
            });

            // 5. Open Thermal Receipt & WhatsApp Modal
            $(document).on('click', '.btn-view-receipt', function() {
                var invId = $(this).data('id');
                self.openReceiptModal(invId, 'invoice');
            });

            $('#btn-print-slip').on('click', function() {
                window.print();
            });

            // Save Receipt Slip as Image
            $(document).on('click', '#btn-save-image-slip', function() {
                var target = $('#receipt-preview-container .kt-thermal-slip')[0];
                if (!target) {
                    alert('Receipt slip element not found.');
                    return;
                }
                var $btn = $(this);
                $btn.prop('disabled', true).text('Saving Image...');

                if (typeof html2canvas !== 'undefined') {
                    html2canvas(target, { scale: 2, backgroundColor: '#ffffff' }).then(function(canvas) {
                        $btn.prop('disabled', false).html('💾 Save Image');
                        var link = document.createElement('a');
                        link.download = 'Khan_Telecom_Receipt_Slip_' + Date.now() + '.png';
                        link.href = canvas.toDataURL('image/png');
                        link.click();
                    }).catch(function(err) {
                        $btn.prop('disabled', false).html('💾 Save Image');
                        alert('Error saving image: ' + err.message);
                    });
                } else {
                    $btn.prop('disabled', false).html('💾 Save Image');
                    alert('Image export module loading. Please try again in a moment.');
                }
            });

            // Filters
            $(document).on('click', '.btn-status-pill', function() {
                $('.btn-status-pill').removeClass('active btn-primary btn-success btn-outline-danger').addClass('btn-secondary');
                var st = $(this).data('status');
                if (st === 'active') {
                    $(this).removeClass('btn-secondary').addClass('active btn-success');
                } else if (st === 'inactive') {
                    $(this).removeClass('btn-secondary').addClass('active btn-outline-danger');
                } else {
                    $(this).removeClass('btn-secondary').addClass('active btn-primary');
                }
                $('#cust-status-filter').val(st);
                self.fetchCustomers();
            });

            // Instant Real-Time Filter & Search Event Listeners
            $(document).on('change input', '#inv-status-filter, #inv-search-input', function() {
                self.fetchInvoices();
            });

            $(document).on('change input', '#cust-status-filter, #cust-search-input', function() {
                var st = $('#cust-status-filter').val();
                $('.btn-status-pill').removeClass('active btn-primary btn-success btn-outline-danger').addClass('btn-secondary');
                if (st === 'active') {
                    $('.btn-status-pill[data-status="active"]').removeClass('btn-secondary').addClass('active btn-success');
                } else if (st === 'inactive') {
                    $('.btn-status-pill[data-status="inactive"]').removeClass('btn-secondary').addClass('active btn-outline-danger');
                } else {
                    $('.btn-status-pill[data-status=""]').removeClass('btn-secondary').addClass('active btn-primary');
                }
                self.fetchCustomers();
            });

            $(document).on('click', '#btn-filter-customers', function() { self.fetchCustomers(); });
            $(document).on('click', '#btn-filter-invoices', function() { self.fetchInvoices(); });
            $(document).on('click', '#btn-refresh-dash', function() { self.fetchDashboardStats(false); });

            // Clickable Dashboard Metric Cards -> Smooth Real-Time Tab Navigation & Data Fetching
            $(document).on('click', '.metric-card-clickable', function() {
                var view = $(this).data('view');
                var filter = $(this).data('filter');

                if (view) {
                    window.location.hash = view;
                    self.switchView(view, filter);
                }
            });

            // Open Subscriber Ledger Modal
            $(document).on('click', '.btn-view-ledger', function() {
                var custId = $(this).data('id');
                self.openLedgerModal(custId);
            });

            // Save Staff Permission & Approval Status (Super Admin Controller)
            $(document).on('click', '.btn-save-staff-perm', function() {
                var $row = $(this).closest('tr');
                var targetUserId = $row.data('user-id');
                var roleLevel = $row.find('.staff-role-select').val();
                var canViewFinancials = $row.find('.chk-financials').is(':checked') ? 1 : 0;
                var canManageCustomers = $row.find('.chk-customers').is(':checked') ? 1 : 0;
                var canCreateInvoice = $row.find('.chk-invoices').is(':checked') ? 1 : 0;
                var canCollectPayment = $row.find('.chk-collections').is(':checked') ? 1 : 0;
                var approvalStatus = $row.find('.staff-approval-select').val();

                var activeUser = self.getUserSession();

                $.post(ktConfig.ajaxUrl, {
                    action: 'kt_save_employee_permission',
                    nonce: ktConfig.nonce,
                    target_user_id: targetUserId,
                    role_level: roleLevel,
                    can_view_financials: canViewFinancials,
                    can_manage_customers: canManageCustomers,
                    can_create_invoice: canCreateInvoice,
                    can_collect_payment: canCollectPayment,
                    approval_status: approvalStatus,
                    current_user_id: activeUser.user_id,
                    current_user_name: activeUser.display_name,
                    current_user_role: activeUser.role_level
                }, function(res) {
                    if (res.success) {
                        alert('✅ ' + res.data.message);
                        self.fetchStaffMatrix();
                    } else {
                        alert(res.data.message || 'Error updating staff permission');
                    }
                });
            });
        },

        /* ==================== 6. ACTIVITY LOGS AUDIT VIEW ==================== */
        loadLogsView: function() {
            var html = `
                <div class="section-header">
                    <div>
                        <h2 class="section-title">System Activity & Action History</h2>
                        <p style="font-size:12px; color: var(--text-muted);">Audit log of all login, subscriber, payment, and staff administrative events.</p>
                    </div>
                </div>

                <div class="kt-table-container">
                    <table class="kt-table">
                        <thead>
                            <tr>
                                <th>Date & Time</th>
                                <th>Performing User</th>
                                <th>Role</th>
                                <th>Action Type</th>
                                <th>Description / Details</th>
                            </tr>
                        </thead>
                        <tbody id="logs-table-body">
                        </tbody>
                    </table>
                </div>
            `;

            $('#kt-view-content').html(html).show();
            $('#kt-view-loader').hide();

            this.fetchActivityLogs();
        },

        fetchActivityLogs: function() {
            $.post(ktConfig.ajaxUrl, { action: 'kt_get_activity_logs', nonce: ktConfig.nonce }, function(res) {
                if (res.success) {
                    var rows = '';
                    if (res.data.logs && res.data.logs.length > 0) {
                        res.data.logs.forEach(function(l) {
                            rows += `
                                <tr>
                                    <td><small>${l.created_at}</small></td>
                                    <td><strong>${l.user_name}</strong></td>
                                    <td><span class="badge badge-active">${l.role_level.toUpperCase()}</span></td>
                                    <td><code>${l.action_type}</code></td>
                                    <td>${l.description}</td>
                                </tr>
                            `;
                        });
                    } else {
                        rows = '<tr><td colspan="5" style="text-align:center; color: var(--text-muted);">No activity logs recorded yet.</td></tr>';
                    }
                    $('#logs-table-body').html(rows);
                }
            });
        },

        openLedgerModal: function(customerId) {
            $.post(ktConfig.ajaxUrl, {
                action: 'kt_get_customer_history',
                nonce: ktConfig.nonce,
                customer_id: customerId
            }, function(res) {
                if (res.success) {
                    var d = res.data;
                    $('#ledger-cust-name').text(d.customer.full_name);
                    $('#ledger-cust-code').text(d.customer.customer_code + ' | Phone: ' + d.customer.phone_number);
                    $('#ledger-cust-balance').text('PKR ' + d.balance);

                    var rows = '';
                    if (d.history && d.history.length > 0) {
                        d.history.forEach(function(h) {
                            var statusBadge = `<span class="badge badge-${h.payment_status}">${h.payment_status}</span>`;
                            rows += `
                                <tr>
                                    <td><strong>${h.billing_month}</strong><br><small style="color:var(--text-muted);">${h.invoice_number}</small></td>
                                    <td>PKR ${parseFloat(h.amount_due).toFixed(2)}</td>
                                    <td style="color:#7ee787; font-weight:bold;">PKR ${parseFloat(h.amount_paid).toFixed(2)}</td>
                                    <td>PKR ${parseFloat(h.discount).toFixed(2)}</td>
                                    <td>${statusBadge}</td>
                                    <td>${h.collector_name || 'Staff'}<br><small style="color:var(--text-muted);">${h.paid_at || 'Unpaid'}</small></td>
                                </tr>
                            `;
                        });
                    } else {
                        rows = '<tr><td colspan="6" style="text-align:center; color: var(--text-muted);">No payment ledger history recorded for this subscriber.</td></tr>';
                    }
                    $('#ledger-table-body').html(rows);
                    $('#kt-ledger-modal, #kt-modal-backdrop').show();
                } else {
                    alert(res.data.message || 'Failed to fetch subscriber ledger');
                }
            });
        },

        openReceiptModal: function(receiptId, receiptType) {
            receiptType = receiptType || 'invoice';
            $.post(ktConfig.ajaxUrl, {
                action: 'kt_get_receipt_data',
                nonce: ktConfig.nonce,
                invoice_id: receiptId,
                sale_id: receiptId,
                receipt_type: receiptType
            }, function(res) {
                if (res.success) {
                    $('#receipt-preview-container').html(res.data.thermal_html);
                    $('#btn-whatsapp-send').attr('href', res.data.whatsapp_link);
                    $('#kt-receipt-modal, #kt-modal-backdrop').show();
                } else {
                    alert(res.data.message || 'Failed to fetch receipt');
                }
            });
        }
    };

    $(document).ready(function() {
        KT_App.init();
    });

})(jQuery);
