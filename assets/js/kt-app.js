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
                display_name: 'Saif Telecom',
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
            $(document).on('submit', '#kt-login-form', function(e) {
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
                $('#kt-modal-backdrop').show();
                $('#kt-change-password-modal').css('display', 'flex');
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
            $(document).on('submit', '#kt-change-password-form', function(e) {
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
            $(document).on('submit', '#kt-register-form', function(e) {
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
                } else if (self.currentView === 'packages') {
                    self.fetchPackages();
                } else if (self.currentView === 'staff') {
                    self.fetchStaffMatrix();
                } else if (self.currentView === 'logs') {
                    self.fetchActivityLogs();
                }
            }, 3000);
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
            var custs = this.getStoredCustomers();
            var invs = this.getStoredInvoices();

            var totalCust = custs.length;
            var activeCust = custs.filter(function(c) { return c.status === 'active'; }).length;
            var inactiveCust = custs.filter(function(c) { return c.status !== 'active'; }).length;

            var monthlyRev = invs.filter(function(i) { return i.payment_status === 'paid'; }).reduce(function(acc, i) { return acc + parseFloat(i.amount_paid || 0); }, 0);
            var pendingDues = invs.filter(function(i) { return i.payment_status !== 'paid'; }).reduce(function(acc, i) { return acc + (parseFloat(i.amount_due || 0) - parseFloat(i.amount_paid || 0)); }, 0);

            $('#dash-total-cust').text(totalCust);
            $('#dash-active-cust').text(activeCust);
            $('#dash-inactive-cust').text(inactiveCust);
            $('#dash-monthly-revenue').text('PKR ' + monthlyRev.toLocaleString('en-US', {minimumFractionDigits: 2}));
            $('#dash-pending-dues').text('PKR ' + pendingDues.toLocaleString('en-US', {minimumFractionDigits: 2}));

            var user = this.getUserSession();
            if (user.permissions && user.permissions.can_view_financials) {
                $('#financial-profit-card').css('display', 'flex');
                $('#dash-net-profit').text('PKR ' + (monthlyRev * 0.45).toLocaleString('en-US', {minimumFractionDigits: 2}));
            } else {
                $('#financial-profit-card').hide();
            }

            var recentPaid = invs.filter(function(i) { return i.payment_status === 'paid'; }).slice(0, 5);
            var rows = '';
            if (recentPaid.length > 0) {
                recentPaid.forEach(function(item) {
                    rows += '<tr>' +
                        '<td><strong>' + item.invoice_number + '</strong></td>' +
                        '<td>' + item.full_name + ' (' + item.customer_code + ')</td>' +
                        '<td style="color:#7ee787; font-weight:bold;">PKR ' + parseFloat(item.amount_paid || 0).toFixed(2) + '</td>' +
                        '<td>' + (item.payment_method || 'cash').toUpperCase().replace('_', ' ') + '</td>' +
                        '<td>' + (item.paid_at || item.created_at || 'Today') + '</td>' +
                    '</tr>';
                });
            } else {
                rows = '<tr><td colspan="5" style="text-align:center; color: var(--text-muted);">No recent payment settlements recorded today.</td></tr>';
            }
            $('#dash-recent-collections').html(rows);

            $.post(ktConfig.ajaxUrl, { action: 'kt_get_dashboard_stats', nonce: ktConfig.nonce });
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

        renderCustomersTable: function(custs, search, statusFilter) {
            search = (search || '').toLowerCase();
            var filtered = custs.filter(function(c) {
                var matchesSearch = !search || 
                    (c.full_name || '').toLowerCase().includes(search) || 
                    (c.customer_code || '').toLowerCase().includes(search) || 
                    (c.phone_number || '').toLowerCase().includes(search) || 
                    (c.area_sector || '').toLowerCase().includes(search);
                var matchesStatus = !statusFilter || c.status === statusFilter;
                return matchesSearch && matchesStatus;
            });

            var totalCount = custs.length;
            var activeCount = custs.filter(function(c) { return c.status === 'active'; }).length;
            var inactiveCount = custs.filter(function(c) { return c.status !== 'active'; }).length;

            $('#count-total').text(totalCount);
            $('#count-active').text(activeCount);
            $('#count-inactive').text(inactiveCount);

            var rows = '';
            if (filtered.length > 0) {
                filtered.forEach(function(c) {
                    var statusBadge = '';
                    var alertBtn = '';
                    if (c.status === 'active') {
                        statusBadge = '<span class="badge badge-active">🟢 Active (' + (c.days_remaining || 30) + 'd Left)</span><br><small style="color:var(--text-muted); font-size:10px;">Expires: ' + (c.expiry_date || 'N/A') + '</small>';
                    } else {
                        var reason = (c.status === 'expired') ? '30-Day Expired' : c.status.toUpperCase();
                        statusBadge = '<span class="badge badge-suspended">🔴 Inactive (' + reason + ')</span><br><small style="color:#ff7b72; font-size:10px;">Package Expired</small>';

                        var cleanPhone = (c.phone_number || '').replace(/^0/, '92');
                        var alertTextRaw = '🚨 *KHAN TELECOM PACKAGE EXPIRY ALERT* 🚨\n----------------------------------\nDear Subscriber: *' + c.full_name + '*\nSubscriber ID: *' + c.customer_code + '*\nArea/Sector: *' + c.area_sector + '*\n\n⚠️ Your 30-Day Broadband Package (*' + (c.package_name || 'Fiber Internet') + '*) has *EXPIRED*.\nYour internet service status is currently: *INACTIVE / EXPIRED*.\n\n💡 Please renew your monthly package fee to continue enjoying high-speed internet service.\n==================================\nContact Khan Telecom Office for instant renewal.\n*Developed by Muhammad Irfan*';
                        var waAlertUrl = 'https://wa.me/' + cleanPhone + '?text=' + encodeURIComponent(alertTextRaw);

                        alertBtn = '<a href="' + waAlertUrl + '" target="_blank" class="btn btn-sm btn-whatsapp btn-send-alert-wa" title="Send WhatsApp Package Expiry Alert">🚨 WhatsApp Alert</a>';
                    }

                    rows += '<tr>' +
                        '<td><strong>' + c.customer_code + '</strong></td>' +
                        '<td>' + c.full_name + '<br><small style="color:var(--text-muted);">' + (c.cnic_id || 'No CNIC') + '</small></td>' +
                        '<td>' + c.phone_number + '<br><small style="color:var(--text-muted);">' + c.area_sector + '</small></td>' +
                        '<td>' + (c.package_name || 'N/A') + '</td>' +
                        '<td><code>' + (c.assigned_ip_ipoe || 'Unassigned') + '</code></td>' +
                        '<td>' + statusBadge + '</td>' +
                        '<td>' +
                            '<div class="action-btn-group">' +
                                '<button class="btn btn-sm btn-secondary btn-edit-customer" data-json=\'' + JSON.stringify(c) + '\'>✏️ Edit</button>' +
                                '<button class="btn btn-sm btn-primary btn-view-ledger" data-id="' + c.id + '">📜 Ledger</button>' +
                                alertBtn +
                                '<button class="btn btn-sm btn-outline-danger btn-delete-customer" data-id="' + c.id + '" data-name="' + c.full_name + '">🗑️ Delete</button>' +
                            '</div>' +
                        '</td>' +
                    '</tr>';
                });
            } else {
                rows = '<tr><td colspan="7" style="text-align:center; color: var(--text-muted);">No subscribers match search filter.</td></tr>';
            }
            $('#cust-table-body').html(rows);
        },

        fetchCustomers: function() {
            var search = ($('#cust-search-input').val() || '').toLowerCase();
            var status = $('#cust-status-filter').val();

            var localCusts = this.getStoredCustomers();
            this.renderCustomersTable(localCusts, search, status);

            var self = this;
            $.post(ktConfig.ajaxUrl, {
                action: 'kt_get_customers',
                nonce: ktConfig.nonce,
                search: search,
                status: status
            }, function(res) {
                if (res && res.success && Array.isArray(res.data)) {
                    res.data.forEach(function(sc) {
                        var match = localCusts.find(function(lc) { return parseInt(lc.id) === parseInt(sc.id); });
                        if (!match) localCusts.push(sc);
                    });
                    self.setStoredCustomers(localCusts);
                    self.renderCustomersTable(localCusts, search, status);
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

        renderPackagesTable: function(pkgList, canEdit) {
            canEdit = (canEdit !== undefined) ? canEdit : true;
            if (canEdit) {
                $('#btn-add-package').show();
            } else {
                $('#btn-add-package').hide();
            }

            var rows = '';
            if (pkgList && pkgList.length > 0) {
                pkgList.forEach(function(p) {
                    var costDisplay = (p.cost_price !== undefined) ? 'PKR ' + parseFloat(p.cost_price).toFixed(2) : '<span style="color:var(--text-muted);">[Restricted]</span>';
                    var marginDisplay = (p.margin !== undefined) ? '<strong style="color:#7ee787;">PKR ' + parseFloat(p.margin).toFixed(2) + '</strong>' : '<span style="color:var(--text-muted);">[Restricted]</span>';

                    rows += '<tr>' +
                        '<td><strong>' + p.package_name + '</strong></td>' +
                        '<td>' + p.speed_mbps + ' Mbps</td>' +
                        '<td>' + costDisplay + '</td>' +
                        '<td style="font-weight:bold;">PKR ' + parseFloat(p.sale_price).toFixed(2) + '</td>' +
                        '<td>' + marginDisplay + '</td>' +
                        '<td><span class="badge badge-' + (p.status || 'active') + '">' + (p.status || 'active') + '</span></td>' +
                        '<td>' +
                            '<div class="action-btn-group">' +
                                (canEdit ? '<button class="btn btn-sm btn-secondary btn-edit-package" data-json=\'' + JSON.stringify(p) + '\'>✏️ Edit</button>' : 'N/A') +
                                (canEdit ? '<button class="btn btn-sm btn-outline-danger btn-delete-package" data-id="' + p.id + '" data-name="' + p.package_name + '">🗑️ Delete</button>' : '') +
                            '</div>' +
                        '</td>' +
                    '</tr>';
                });
            } else {
                rows = '<tr><td colspan="7" style="text-align:center; color: var(--text-muted);">No broadband packages found. Click "➕ Create New Package" to add your first package.</td></tr>';
            }
            $('#pkg-table-body').html(rows);
        },

        fetchPackages: function() {
            var self = this;
            var localPkgs = this.getStoredPackages();
            this.renderPackagesTable(localPkgs, true);

            $.post(ktConfig.ajaxUrl, { action: 'kt_get_packages', nonce: ktConfig.nonce }, function(res) {
                if (res && res.success) {
                    var pkgList = Array.isArray(res.data) ? res.data : ((res.data && res.data.packages) ? res.data.packages : []);
                    var canEdit = (res.data && res.data.can_edit !== undefined) ? res.data.can_edit : true;

                    if (pkgList && pkgList.length > 0) {
                        pkgList.forEach(function(sp) {
                            var match = localPkgs.find(function(lp) { return parseInt(lp.id) === parseInt(sp.id); });
                            if (!match) localPkgs.push(sp);
                        });
                        self.setStoredPackages(localPkgs);
                    }
                    self.renderPackagesTable(localPkgs, canEdit);
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

        renderProductsTable: function(products) {
            var rows = '';
            this.productsList = products;
            if (products.length > 0) {
                products.forEach(function(p) {
                    var costDisplay = (p.cost_price !== undefined) ? 'PKR ' + parseFloat(p.cost_price).toFixed(2) : '<span style="color:var(--text-muted);">[Restricted]</span>';
                    var marginDisplay = (p.margin !== undefined) ? '<strong style="color:#7ee787;">PKR ' + parseFloat(p.margin).toFixed(2) + '</strong>' : '<span style="color:var(--text-muted);">[Restricted]</span>';
                    var stockBadge = p.stock_qty > 5 ? '<span class="badge badge-active">' + p.stock_qty + ' ' + p.unit + '</span>' : '<span class="badge badge-suspended">' + p.stock_qty + ' ' + p.unit + ' (Low)</span>';

                    rows += '<tr>' +
                        '<td><strong>' + p.product_name + '</strong></td>' +
                        '<td><span class="badge badge-pending">' + p.category + '</span></td>' +
                        '<td>' + stockBadge + '</td>' +
                        '<td>' + costDisplay + '</td>' +
                        '<td style="font-weight:bold;">PKR ' + parseFloat(p.sale_price).toFixed(2) + '</td>' +
                        '<td>' + marginDisplay + '</td>' +
                        '<td>' +
                            '<div class="action-btn-group">' +
                                '<button class="btn btn-sm btn-secondary btn-edit-product" data-json=\'' + JSON.stringify(p) + '\'>✏️ Edit</button>' +
                                '<button class="btn btn-sm btn-whatsapp btn-sell-product-row" data-id="' + p.id + '" data-name="' + p.product_name + '" data-price="' + p.sale_price + '">📱 Sell & WhatsApp</button>' +
                                '<button class="btn btn-sm btn-outline-danger btn-delete-product" data-id="' + p.id + '" data-name="' + p.product_name + '">🗑️ Delete</button>' +
                            '</div>' +
                        '</td>' +
                    '</tr>';
                });
            } else {
                rows = '<tr><td colspan="7" style="text-align:center; color: var(--text-muted);">No hardware inventory products found.</td></tr>';
            }
            $('#prod-table-body').html(rows);

            var selectOpts = '<option value="">-- Select Hardware Product --</option>';
            products.forEach(function(p) {
                selectOpts += '<option value="' + p.id + '" data-price="' + p.sale_price + '">' + p.product_name + ' (Stock: ' + p.stock_qty + ' ' + p.unit + ' - PKR ' + p.sale_price + ')</option>';
            });
            $('#sell-product-select').html(selectOpts);
        },

        fetchProducts: function() {
            var prods = this.getStoredProducts();
            this.renderProductsTable(prods);

            var self = this;
            $.post(ktConfig.ajaxUrl, { action: 'kt_get_products', nonce: ktConfig.nonce }, function(res) {
                if (res && res.success && res.data && Array.isArray(res.data.products)) {
                    res.data.products.forEach(function(sp) {
                        var match = prods.find(function(lp) { return parseInt(lp.id) === parseInt(sp.id); });
                        if (!match) prods.push(sp);
                    });
                    self.setStoredProducts(prods);
                    self.renderProductsTable(prods);
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

        renderInvoicesTable: function(invList, search, statusFilter) {
            search = (search || '').toLowerCase();
            var filtered = invList.filter(function(inv) {
                var matchesSearch = !search ||
                    (inv.invoice_number || '').toLowerCase().includes(search) ||
                    (inv.full_name || '').toLowerCase().includes(search) ||
                    (inv.customer_code || '').toLowerCase().includes(search);
                var matchesStatus = !statusFilter || inv.payment_status === statusFilter;
                return matchesSearch && matchesStatus;
            });

            var rows = '';
            if (filtered.length > 0) {
                filtered.forEach(function(inv) {
                    var statusBadge = '<span class="badge badge-' + inv.payment_status + '">' + inv.payment_status + '</span>';
                    var isPaid = (inv.payment_status === 'paid');

                    rows += '<tr>' +
                        '<td><strong>' + inv.invoice_number + '</strong></td>' +
                        '<td>' + inv.full_name + '<br><small style="color:var(--text-muted);">' + inv.customer_code + ' | ' + (inv.phone_number || '') + '</small></td>' +
                        '<td>' + inv.billing_month + '</td>' +
                        '<td>PKR ' + parseFloat(inv.amount_due).toFixed(2) + '</td>' +
                        '<td style="color:' + (isPaid ? '#7ee787' : '#ff7b72') + '; font-weight:bold;">PKR ' + parseFloat(inv.amount_paid).toFixed(2) + '</td>' +
                        '<td>' + statusBadge + '</td>' +
                        '<td>' +
                            '<div class="action-btn-group">' +
                                (!isPaid ? '<button class="btn btn-sm btn-success btn-collect-pay" data-id="' + inv.id + '" data-name="' + inv.full_name + '" data-due="' + inv.amount_due + '">💰 Collect Fee</button>' : '') +
                                (isPaid ? '<button class="btn btn-sm btn-primary btn-view-receipt" data-id="' + inv.id + '">🧾 Slip & WhatsApp</button>' : '') +
                                '<button class="btn btn-sm btn-secondary btn-toggle-inv-status" data-id="' + inv.id + '" data-status="' + (isPaid ? 'unpaid' : 'paid') + '" title="Toggle Payment Status">' + (isPaid ? '↩️ Mark Unpaid' : '✅ Mark Paid') + '</button>' +
                                '<button class="btn btn-sm btn-outline-danger btn-delete-invoice" data-id="' + inv.id + '" data-no="' + inv.invoice_number + '" title="Delete Invoice">🗑️</button>' +
                            '</div>' +
                        '</td>' +
                    '</tr>';
                });
            } else {
                rows = '<tr><td colspan="7" style="text-align:center; color: var(--text-muted);">No invoices match search filter.</td></tr>';
            }
            $('#inv-table-body').html(rows);
        },

        fetchInvoices: function() {
            var search = $('#inv-search-input').val();
            var status = $('#inv-status-filter').val();

            var invs = this.getStoredInvoices();
            this.renderInvoicesTable(invs, search, status);

            var self = this;
            $.post(ktConfig.ajaxUrl, {
                action: 'kt_get_invoices',
                nonce: ktConfig.nonce,
                search: search,
                status: status
            }, function(res) {
                if (res && res.success && Array.isArray(res.data)) {
                    res.data.forEach(function(sinv) {
                        var match = invs.find(function(linv) { return parseInt(linv.id) === parseInt(sinv.id); });
                        if (!match) invs.push(sinv);
                    });
                    self.setStoredInvoices(invs);
                    self.renderInvoicesTable(invs, search, status);
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

        renderStaffMatrix: function(matrix) {
            var rows = '';
            if (matrix && matrix.length > 0) {
                matrix.forEach(function(item) {
                    var p = item.permissions || {};
                    rows += '<tr data-user-id="' + item.user_id + '">' +
                        '<td><strong>' + item.display_name + '</strong><br><small style="color:var(--text-muted);">' + (item.user_email || 'staff@khantelecom.com') + '</small></td>' +
                        '<td>' +
                            '<select class="staff-role-select" style="padding:4px; font-size:12px;">' +
                                '<option value="super_admin" ' + (p.role_level === 'super_admin' ? 'selected' : '') + '>Super Admin</option>' +
                                '<option value="admin" ' + (p.role_level === 'admin' ? 'selected' : '') + '>Admin</option>' +
                                '<option value="employee" ' + (p.role_level === 'employee' ? 'selected' : '') + '>Field Employee</option>' +
                            '</select>' +
                        '</td>' +
                        '<td><input type="checkbox" class="chk-financials" ' + (p.can_view_financials == 1 ? 'checked' : '') + '></td>' +
                        '<td><input type="checkbox" class="chk-customers" ' + (p.can_manage_customers == 1 ? 'checked' : '') + '></td>' +
                        '<td><input type="checkbox" class="chk-invoices" ' + (p.can_create_invoice == 1 ? 'checked' : '') + '></td>' +
                        '<td><input type="checkbox" class="chk-collections" ' + (p.can_collect_payment == 1 ? 'checked' : '') + '></td>' +
                        '<td>' +
                            '<select class="staff-approval-select" style="padding:4px; font-size:12px;">' +
                                '<option value="approved" ' + (p.approval_status === 'approved' ? 'selected' : '') + '>Approved</option>' +
                                '<option value="pending_approval" ' + (p.approval_status === 'pending_approval' ? 'selected' : '') + '>Pending</option>' +
                                '<option value="revoked" ' + (p.approval_status === 'revoked' ? 'selected' : '') + '>Revoked</option>' +
                            '</select>' +
                        '</td>' +
                        '<td>' +
                            '<button class="btn btn-sm btn-primary btn-save-staff-perm">💾 Save</button>' +
                        '</td>' +
                    '</tr>';
                });
            } else {
                rows = '<tr><td colspan="8" style="text-align:center; color: var(--text-muted);">No staff accounts found.</td></tr>';
            }
            $('#staff-table-body').html(rows);
        },

        fetchStaffMatrix: function() {
            var staff = this.getStoredStaff();
            this.renderStaffMatrix(staff);

            var self = this;
            $.post(ktConfig.ajaxUrl, { action: 'kt_get_employee_matrix', nonce: ktConfig.nonce }, function(res) {
                if (res && res.success && res.data && Array.isArray(res.data.matrix)) {
                    res.data.matrix.forEach(function(sm) {
                        var match = staff.find(function(lm) { return parseInt(lm.user_id) === parseInt(sm.user_id); });
                        if (!match) staff.push(sm);
                    });
                    self.setStoredStaff(staff);
                    self.renderStaffMatrix(staff);
                }
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

        renderActivityLogs: function(logs) {
            var rows = '';
            if (logs && logs.length > 0) {
                logs.forEach(function(l) {
                    rows += '<tr>' +
                        '<td><small>' + (l.created_at || 'Just now') + '</small></td>' +
                        '<td><strong>' + (l.user_name || 'Saif Telecom') + '</strong></td>' +
                        '<td><span class="badge badge-active">' + (l.role_level || 'SUPER_ADMIN').toUpperCase() + '</span></td>' +
                        '<td><code>' + (l.action_type || 'audit_log') + '</code></td>' +
                        '<td>' + l.description + '</td>' +
                    '</tr>';
                });
            } else {
                rows = '<tr><td colspan="5" style="text-align:center; color: var(--text-muted);">No activity logs recorded yet.</td></tr>';
            }
            $('#logs-table-body').html(rows);
        },

        fetchActivityLogs: function() {
            var logs = this.getStoredLogs();
            this.renderActivityLogs(logs);

            var self = this;
            $.post(ktConfig.ajaxUrl, { action: 'kt_get_activity_logs', nonce: ktConfig.nonce }, function(res) {
                if (res && res.success && res.data && Array.isArray(res.data.logs)) {
                    res.data.logs.forEach(function(sl) {
                        var match = logs.find(function(ll) { return parseInt(ll.id) === parseInt(sl.id); });
                        if (!match) logs.push(sl);
                    });
                    localStorage.setItem('kt_storage_logs', JSON.stringify(logs));
                    self.renderActivityLogs(logs);
                }
            });
        },

        

        openLedgerModal: function(customerId) {
            var custs = this.getStoredCustomers();
            var cust = custs.find(function(c) { return parseInt(c.id) === parseInt(customerId); });
            var invs = this.getStoredInvoices().filter(function(i) { return parseInt(i.customer_id) === parseInt(customerId); });

            if (cust) {
                $('#ledger-cust-name').text(cust.full_name);
                $('#ledger-cust-code').text(cust.customer_code + ' | Phone: ' + cust.phone_number);

                var unpaidDues = invs.filter(function(i) { return i.payment_status !== 'paid'; }).reduce(function(acc, i) { return acc + (parseFloat(i.amount_due || 0) - parseFloat(i.amount_paid || 0)); }, 0);
                $('#ledger-cust-balance').text('PKR ' + unpaidDues.toFixed(2));

                var rows = '';
                if (invs.length > 0) {
                    invs.forEach(function(h) {
                        var statusBadge = '<span class="badge badge-' + h.payment_status + '">' + h.payment_status + '</span>';
                        rows += '<tr>' +
                            '<td><strong>' + h.billing_month + '</strong><br><small style="color:var(--text-muted);">' + h.invoice_number + '</small></td>' +
                            '<td>PKR ' + parseFloat(h.amount_due).toFixed(2) + '</td>' +
                            '<td style="color:#7ee787; font-weight:bold;">PKR ' + parseFloat(h.amount_paid).toFixed(2) + '</td>' +
                            '<td>PKR ' + parseFloat(h.discount || 0).toFixed(2) + '</td>' +
                            '<td>' + statusBadge + '</td>' +
                            '<td>' + (h.collector_name || 'Staff') + '<br><small style="color:var(--text-muted);">' + (h.paid_at || 'Unpaid') + '</small></td>' +
                        '</tr>';
                    });
                } else {
                    rows = '<tr><td colspan="6" style="text-align:center; color: var(--text-muted);">No payment ledger history recorded for this subscriber.</td></tr>';
                }
                $('#ledger-table-body').html(rows);
                $('#kt-modal-backdrop').show();
                $('#kt-ledger-modal').css('display', 'flex');
            }
        },

        openReceiptModal: function(receiptId, receiptType) {
            receiptType = receiptType || 'invoice';
            var invs = this.getStoredInvoices();
            var inv = invs.find(function(i) { return parseInt(i.id) === parseInt(receiptId); });
            var activeUser = this.getUserSession().display_name || 'Saif Telecom';

            var htmlContent = '';
            var waTextRaw = '';
            var cleanPhone = '923000000000';

            if (inv) {
                cleanPhone = (inv.phone_number || '').replace(/^0/, '92');
                htmlContent = '<div class="kt-thermal-slip">' +
                    '<div class="slip-header">' +
                        '<img src="/assets/img/logo.png" style="width:48px; height:48px; object-fit:contain; margin-bottom:4px;">' +
                        '<h2>KHAN TELECOM</h2>' +
                        '<p class="slip-subtitle">HIGH-SPEED BROADBAND PROVIDER</p>' +
                        '<div class="slip-divider">--------------------------------</div>' +
                    '</div>' +
                    '<div class="slip-body">' +
                        '<div class="slip-row"><span>Invoice No:</span> <strong>' + inv.invoice_number + '</strong></div>' +
                        '<div class="slip-row"><span>Date:</span> <span>' + (inv.paid_at || 'Just Now') + '</span></div>' +
                        '<div class="slip-row"><span>Customer ID:</span> <strong>' + inv.customer_code + '</strong></div>' +
                        '<div class="slip-row"><span>Customer Name:</span> <span>' + inv.full_name + '</span></div>' +
                        '<div class="slip-row"><span>Phone:</span> <span>' + inv.phone_number + '</span></div>' +
                        '<div class="slip-row"><span>Area/Sector:</span> <span>' + inv.area_sector + '</span></div>' +
                        '<div class="slip-divider">--------------------------------</div>' +
                        '<div class="slip-row"><span>Billing Month:</span> <span>' + inv.billing_month + '</span></div>' +
                        '<div class="slip-row"><span>Amount Due:</span> <span>PKR ' + parseFloat(inv.amount_due).toFixed(2) + '</span></div>' +
                        '<div class="slip-row slip-total"><span>Amount Paid:</span> <strong>PKR ' + parseFloat(inv.amount_paid).toFixed(2) + '</strong></div>' +
                        '<div class="slip-row"><span>Payment Method:</span> <span>' + (inv.payment_method || 'cash').toUpperCase().replace('_', ' ') + '</span></div>' +
                        '<div class="slip-row"><span>Status:</span> <strong class="badge-paid">' + (inv.payment_status || 'PAID').toUpperCase() + '</strong></div>' +
                        '<div class="slip-divider">--------------------------------</div>' +
                        '<div class="slip-row"><span>Collector:</span> <span>' + (inv.collector_name || activeUser) + '</span></div>' +
                    '</div>' +
                    '<div class="slip-footer">' +
                        '<p>Thank you for choosing Khan Telecom!</p>' +
                        '<p class="slip-credits">Developed by Muhammad Irfan</p>' +
                    '</div>' +
                '</div>';

                waTextRaw = '⚡ *KHAN TELECOM* ⚡\n_HIGH-SPEED BROADBAND PROVIDER_\n----------------------------------\n*RECEIPT NO:* ' + inv.invoice_number + '\n*DATE:* ' + (inv.paid_at || 'Just Now') + '\n*SUBSCRIBER ID:* ' + inv.customer_code + '\n*NAME:* ' + inv.full_name + '\n*PHONE:* ' + inv.phone_number + '\n*AREA:* ' + inv.area_sector + '\n----------------------------------\n*BILLING MONTH:* ' + inv.billing_month + '\n*AMOUNT DUE:* PKR ' + parseFloat(inv.amount_due).toFixed(2) + '\n*AMOUNT PAID:* PKR ' + parseFloat(inv.amount_paid).toFixed(2) + '\n*PAYMENT METHOD:* ' + (inv.payment_method || 'cash').toUpperCase().replace('_', ' ') + '\n*STATUS:* ' + (inv.payment_status || 'PAID').toUpperCase() + ' ✅\n----------------------------------\n*COLLECTOR:* ' + (inv.collector_name || activeUser) + '\n==================================\nThank you for choosing Khan Telecom!\n*Developed by Muhammad Irfan*';
            } else {
                htmlContent = '<div style="padding:20px; text-align:center;">Payment slip preview created.</div>';
                waTextRaw = 'Thank you for your payment to Khan Telecom!';
            }

            var waLink = 'https://wa.me/' + cleanPhone + '?text=' + encodeURIComponent(waTextRaw);
            $('#receipt-preview-container').html(htmlContent);
            $('#btn-whatsapp-send').attr('href', waLink);
            $('#kt-modal-backdrop').show();
            $('#kt-receipt-modal').css('display', 'flex');
        },
    };


    $(document).ready(function() {
        KT_App.init();
    });

})(jQuery);
