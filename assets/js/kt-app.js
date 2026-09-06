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
                        self.showToast(res.data.message, 'success');
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
                        self.showToast(res.data.message, 'success');
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

            $(document).on('click', '#kt-drawer-toggle', function() {
                $('#kt-sidebar').toggleClass('active');
            });

            $(document).on('click', '.nav-item', function(e) {
                e.preventDefault();
                var view = $(this).data('view');
                if (view) {
                    window.location.hash = view;
                    self.switchView(view);
                    $('#kt-sidebar').removeClass('active');
                }
            });

            $(window).on('hashchange', function() {
                var hash = window.location.hash.replace('#', '') || 'dashboard';
                self.switchView(hash);
            });
        },

        
        /* ==================== MODALS & CALCULATORS ==================== */
        
        showToast: function(message, type) {
            type = type || 'success';
            var icon = type === 'success' ? '⚡' : (type === 'danger' ? '🗑️' : 'ℹ️');
            var $container = $('#kt-toast-container');
            if (!$container.length) {
                $('body').append('<div id="kt-toast-container" class="kt-toast-container"></div>');
                $container = $('#kt-toast-container');
            }
            var $toast = $('<div class="kt-toast kt-toast-' + type + '"><span>' + icon + '</span><span>' + message + '</span></div>');
            $container.append($toast);
            setTimeout(function() {
                $toast.css('animation', 'toastOut 0.3s ease forwards');
                setTimeout(function() { $toast.remove(); }, 300);
            }, 3200);
        },

        
        
        openCreateSubscriberModal: function() {
            try {
                this.populateCustomerAndPackageSelects();
                if ($('#kt-customer-form').length) $('#kt-customer-form')[0].reset();
                $('#kt-customer-form input[name="id"]').val(0);
                
                var custs = this.getStoredCustomers();
                var nextCode = 1001;
                if (custs && custs.length > 0) {
                    var codes = custs.map(function(c) {
                        var m = (c.customer_code || '').match(/\d+/);
                        return m ? parseInt(m[0]) : 0;
                    });
                    var maxC = Math.max.apply(null, codes);
                    if (maxC && maxC >= 1000) nextCode = maxC + 1;
                }
                $('#kt-customer-form input[name="customer_code"]').val('KT-' + nextCode);
                $('#customer-modal-title').text('Register New Subscriber');
                $('#btn-delete-customer-modal').hide();
                $('#kt-modal-backdrop').show().css('display', 'block');
                $('#kt-customer-modal').show().css('display', 'flex');
            } catch(e) {
                console.error("Error opening subscriber modal:", e);
            }
        },

        openEditSubscriberModal: function(elem) {
            try {
                this.populateCustomerAndPackageSelects();
                var data = $(elem).data('json');
                if (typeof data === 'string') { try { data = JSON.parse(data); } catch(e) {} }
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
                $('#kt-modal-backdrop').show().css('display', 'block');
                $('#kt-customer-modal').show().css('display', 'flex');
            } catch(e) {
                console.error("Error editing subscriber modal:", e);
            }
        },

        openCreatePackageModal: function() {
            try {
                if ($('#kt-package-form').length) $('#kt-package-form')[0].reset();
                $('#kt-package-form input[name="id"]').val(0);
                $('#package-modal-title').text('Create Package Tier');
                $('#pkg-margin-preview').text('PKR 1000.00');
                $('#kt-modal-backdrop').show().css('display', 'block');
                $('#kt-package-modal').show().css('display', 'flex');
            } catch(e) {
                console.error("Error opening package modal:", e);
            }
        },

        openEditPackageModal: function(elem) {
            try {
                var p = $(elem).data('json');
                if (typeof p === 'string') { try { p = JSON.parse(p); } catch(e) {} }
                $('#kt-package-form input[name="id"]').val(p.id);
                $('#kt-package-form input[name="package_name"]').val(p.package_name);
                $('#kt-package-form input[name="speed_mbps"]').val(p.speed_mbps);
                $('#kt-package-form input[name="cost_price"]').val(p.cost_price || 0);
                $('#kt-package-form input[name="sale_price"]').val(p.sale_price);
                $('#kt-package-form select[name="status"]').val(p.status || 'active');

                var margin = Math.max(0, parseFloat(p.sale_price) - parseFloat(p.cost_price || 0));
                $('#pkg-margin-preview').text('PKR ' + margin.toFixed(2));

                $('#package-modal-title').text('Edit Package Tier');
                $('#kt-modal-backdrop').show().css('display', 'block');
                $('#kt-package-modal').show().css('display', 'flex');
            } catch(e) {
                console.error("Error editing package modal:", e);
            }
        },

        
        /* ==================== GLOBAL FAIL-PROOF MODAL TRIGGERS ==================== */
        openCreateSubscriberModal: function() {
            try {
                this.populateCustomerAndPackageSelects();
                if ($('#kt-customer-form').length) $('#kt-customer-form')[0].reset();
                $('#kt-customer-form input[name="id"]').val(0);
                var custs = this.getStoredCustomers();
                var nextCode = 1001;
                if (custs && custs.length > 0) {
                    var codes = custs.map(function(c) {
                        var m = (c.customer_code || '').match(/\d+/);
                        return m ? parseInt(m[0]) : 0;
                    });
                    var maxC = Math.max.apply(null, codes);
                    if (maxC && maxC >= 1000) nextCode = maxC + 1;
                }
                $('#kt-customer-form input[name="customer_code"]').val('KT-' + nextCode);
                $('#customer-modal-title').text('Register New Subscriber');
                $('#btn-delete-customer-modal').hide();
                $('#kt-modal-backdrop').show().css('display', 'block');
                $('#kt-customer-modal').show().css('display', 'flex');
            } catch(e) { console.error(e); }
        },

        openEditSubscriberModal: function(elem) {
            try {
                this.populateCustomerAndPackageSelects();
                var data = $(elem).data('json');
                if (typeof data === 'string') { try { data = JSON.parse(data); } catch(e) {} }
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
                $('#kt-modal-backdrop').show().css('display', 'block');
                $('#kt-customer-modal').show().css('display', 'flex');
            } catch(e) { console.error(e); }
        },

        openCreatePackageModal: function() {
            try {
                if ($('#kt-package-form').length) $('#kt-package-form')[0].reset();
                $('#kt-package-form input[name="id"]').val(0);
                $('#package-modal-title').text('Create Package Tier');
                $('#pkg-margin-preview').text('PKR 1000.00');
                $('#kt-modal-backdrop').show().css('display', 'block');
                $('#kt-package-modal').show().css('display', 'flex');
            } catch(e) { console.error(e); }
        },

        openEditPackageModal: function(elem) {
            try {
                var p = $(elem).data('json');
                if (typeof p === 'string') { try { p = JSON.parse(p); } catch(e) {} }
                $('#kt-package-form input[name="id"]').val(p.id);
                $('#kt-package-form input[name="package_name"]').val(p.package_name);
                $('#kt-package-form input[name="speed_mbps"]').val(p.speed_mbps);
                $('#kt-package-form input[name="cost_price"]').val(p.cost_price || 0);
                $('#kt-package-form input[name="sale_price"]').val(p.sale_price);
                $('#kt-package-form select[name="status"]').val(p.status || 'active');
                var margin = Math.max(0, parseFloat(p.sale_price) - parseFloat(p.cost_price || 0));
                $('#pkg-margin-preview').text('PKR ' + margin.toFixed(2));
                $('#package-modal-title').text('Edit Package Tier');
                $('#kt-modal-backdrop').show().css('display', 'block');
                $('#kt-package-modal').show().css('display', 'flex');
            } catch(e) { console.error(e); }
        },

        
        openEditProductModal: function(elem) {
            try {
                var p = $(elem).data('json');
                if (typeof p === 'string') { try { p = JSON.parse(p); } catch(e) {} }
                if ($('#kt-product-form').length) $('#kt-product-form')[0].reset();
                $('#kt-product-form input[name="id"]').val(p.id);
                $('#kt-product-form input[name="product_name"]').val(p.product_name);
                $('#kt-product-form select[name="category"]').val(p.category || 'Routers');
                $('#kt-product-form input[name="unit"]').val(p.unit || 'pcs');
                $('#kt-product-form input[name="cost_price"]').val(p.cost_price);
                $('#kt-product-form input[name="sale_price"]').val(p.sale_price);
                $('#kt-product-form input[name="stock_qty"]').val(p.stock_qty);
                $('#product-modal-title').text('Edit Hardware Product Stock');
                $('#kt-modal-backdrop').show().css('display', 'block');
                $('#kt-product-modal').show().css('display', 'flex');
            } catch(e) { console.error("Error opening edit product modal:", e); }
        },

        openCreateProductModal: function() {
            try {
                if ($('#kt-product-form').length) $('#kt-product-form')[0].reset();
                $('#kt-product-form input[name="id"]').val(0);
                $('#product-modal-title').text('Buy / Add Hardware Product Stock');
                $('#kt-modal-backdrop').show().css('display', 'block');
                $('#kt-product-modal').show().css('display', 'flex');
            } catch(e) { console.error(e); }
        },

        openSellProductModal: function() {
            try {
                var prods = this.getStoredProducts();
                var custs = this.getStoredCustomers();
                var pOpts = '<option value="">-- Select Hardware Product --</option>';
                prods.forEach(function(p) { pOpts += '<option value="' + p.id + '" data-price="' + p.sale_price + '">' + p.product_name + ' (Stock: ' + p.stock_qty + ' - PKR ' + p.sale_price + ')</option>'; });
                $('#sell-product-select').html(pOpts);

                var cOpts = '<option value="">-- Select Subscriber --</option>';
                custs.forEach(function(c) { cOpts += '<option value="' + c.id + '">' + c.full_name + ' (' + c.customer_code + ')</option>'; });
                $('#sell-customer-select').html(cOpts);

                if ($('#kt-sell-product-form').length) $('#kt-sell-product-form')[0].reset();
                $('#sell-unit-price').val('PKR 0.00');
                $('#sell-total-preview').text('PKR 0.00');
                $('#kt-modal-backdrop').show().css('display', 'block');
                $('#kt-sell-product-modal').show().css('display', 'flex');
            } catch(e) { console.error(e); }
        },

        openCreateInvoiceModal: function() {
            try {
                var custs = this.getStoredCustomers();
                var opts = '<option value="">-- Select Subscriber --</option>';
                custs.forEach(function(c) { opts += '<option value="' + c.id + '">' + c.full_name + ' (' + c.customer_code + ' - ' + c.area_sector + ')</option>'; });
                $('#invoice-customer-select').html(opts);
                if ($('#kt-invoice-form').length) $('#kt-invoice-form')[0].reset();
                $('#kt-modal-backdrop').show().css('display', 'block');
                $('#kt-invoice-modal').show().css('display', 'flex');
            } catch(e) { console.error(e); }
        },

        openChangePasswordModal: function() {
            try {
                var u = this.getUserSession();
                if ($('#kt-change-password-form').length) $('#kt-change-password-form')[0].reset();
                $('#change-pass-username').val(u.user_login || 'saif');
                $('#change-pass-new, #change-pass-confirm').attr('type', 'password');
                $('.btn-toggle-pass').text('👁️');
                $('#kt-modal-backdrop').show().css('display', 'block');
                $('#kt-change-password-modal').show().css('display', 'flex');
            } catch(e) { console.error(e); }
        },

        bindModals: function() {
            var self = this;
            $(document).on('click', '.modal-close, #kt-modal-backdrop', function() {
                $('.kt-modal, #kt-modal-backdrop').hide();
            });
            this.populateCustomerAndPackageSelects();
        },

        populateCustomerAndPackageSelects: function() {
            var self = this;
            var localPkgs = this.getStoredPackages();
            var renderPkgOptions = function(pkgs) {
                var opts = '<option value="">-- Select Package --</option>';
                if (pkgs && pkgs.length > 0) {
                    pkgs.forEach(function(p) {
                        opts += '<option value="' + p.id + '">' + p.package_name + ' (' + p.speed_mbps + ' Mbps - PKR ' + p.sale_price + ')</option>';
                    });
                }
                $('#cust-package-select').html(opts);
            };
            renderPkgOptions(localPkgs);

            $.post(ktConfig.ajaxUrl, { action: 'kt_get_packages', nonce: ktConfig.nonce }, function(res) {
                if (res && res.success) {
                    var pkgList = Array.isArray(res.data) ? res.data : ((res.data && res.data.packages) ? res.data.packages : []);
                    if (pkgList && pkgList.length > 0) {
                        pkgList.forEach(function(sp) {
                            var match = localPkgs.find(function(lp) { return parseInt(lp.id) === parseInt(sp.id); });
                            if (!match) localPkgs.push(sp);
                            else {
                                match.package_name = sp.package_name;
                                match.speed_mbps = sp.speed_mbps;
                                match.cost_price = sp.cost_price;
                                match.sale_price = sp.sale_price;
                                match.margin = sp.margin;
                                match.status = sp.status;
                            }
                        });
                        self.setStoredPackages(localPkgs);
                        renderPkgOptions(localPkgs);
                    }
                }
            });
        },

        bindCalculators: function() {
            $(document).on('input', '#pkg-cost, #pkg-sale', function() {
                var cost = parseFloat($('#pkg-cost').val()) || 0;
                var sale = parseFloat($('#pkg-sale').val()) || 0;
                var margin = Math.max(0, sale - cost);
                $('#pkg-margin-preview').text('PKR ' + margin.toFixed(2));
            });

            $(document).on('change', '#sell-product-select', function() {
                var price = parseFloat($(this).find(':selected').data('price')) || 0;
                $('#sell-unit-price').val('PKR ' + price.toFixed(2));
                var qty = parseInt($('#sell-qty-input').val()) || 1;
                $('#sell-total-preview').text('PKR ' + (price * qty).toFixed(2));
            });

            $(document).on('input', '#sell-qty-input', function() {
                var price = parseFloat($('#sell-product-select').find(':selected').data('price')) || 0;
                var qty = parseInt($(this).val()) || 1;
                $('#sell-total-preview').text('PKR ' + (price * qty).toFixed(2));
            });
        },

        /* ==================== BUTTON ACTIONS & FORM SUBMISSIONS ==================== */
        bindActions: function() {
            var self = this;

            // --- 1. PACKAGES MODAL & FORMS ---
            $(document).on('click', '#btn-add-package', function(e) {
                e.preventDefault();
                self.openCreatePackageModal();
            });

            $(document).on('click', '.btn-edit-package', function() {
                var p = $(this).data('json');
                if (typeof p === 'string') { try { p = JSON.parse(p); } catch(e) {} }
                $('#kt-package-form input[name="id"]').val(p.id);
                $('#kt-package-form input[name="package_name"]').val(p.package_name);
                $('#kt-package-form input[name="speed_mbps"]').val(p.speed_mbps);
                $('#kt-package-form input[name="cost_price"]').val(p.cost_price || 0);
                $('#kt-package-form input[name="sale_price"]').val(p.sale_price);
                $('#kt-package-form select[name="status"]').val(p.status || 'active');

                var margin = Math.max(0, parseFloat(p.sale_price) - parseFloat(p.cost_price || 0));
                $('#pkg-margin-preview').text('PKR ' + margin.toFixed(2));

                $('#package-modal-title').text('Edit Package Tier');
                $('#kt-modal-backdrop').show();
                $('#kt-package-modal').css('display', 'flex');
            });

            $(document).on('submit', '#kt-package-form', function(e) {
                e.preventDefault();
                var $submitBtn = $(this).find('button[type="submit"]');
                var origText = $submitBtn.text();
                $submitBtn.prop('disabled', true).text('Saving...');

                var user = self.getUserSession();
                var formDataRaw = $(this).serializeArray();
                var formData = {};
                formDataRaw.forEach(function(item) { formData[item.name] = item.value; });

                var pkgs = self.getStoredPackages();
                var pkgId = parseInt(formData.id) || 0;
                var costPrice = parseFloat(formData.cost_price) || 0;
                var salePrice = parseFloat(formData.sale_price) || 0;
                var marginPrice = Math.max(0, salePrice - costPrice);

                var updatedPkg = {
                    id: pkgId > 0 ? pkgId : (pkgs.length > 0 ? Math.max.apply(null, pkgs.map(function(p){return parseInt(p.id);})) + 1 : 1),
                    package_name: formData.package_name,
                    speed_mbps: parseInt(formData.speed_mbps) || 10,
                    cost_price: costPrice,
                    sale_price: salePrice,
                    margin: marginPrice,
                    status: formData.status || 'active'
                };

                if (pkgId > 0) {
                    var idx = pkgs.findIndex(function(p) { return parseInt(p.id) === pkgId; });
                    if (idx !== -1) pkgs[idx] = updatedPkg;
                    else pkgs.push(updatedPkg);
                } else {
                    pkgs.push(updatedPkg);
                }

                self.setStoredPackages(pkgs);
                self.renderPackagesTable(pkgs, true);
                self.populateCustomerAndPackageSelects();

                var postData = $(this).serialize() + '&action=kt_save_package&nonce=' + ktConfig.nonce + '&current_user_id=' + user.user_id + '&current_user_name=' + encodeURIComponent(user.display_name) + '&current_user_role=' + user.role_level;
                $.post(ktConfig.ajaxUrl, postData, function(res) {
                    $submitBtn.prop('disabled', false).text(origText);
                    self.showToast('Package saved successfully & active!', 'success');
                    $('#kt-package-modal, #kt-modal-backdrop').hide();
                    self.fetchPackages();
                    self.fetchCustomers();
                    self.populateCustomerAndPackageSelects();
                    self.fetchDashboardStats(true);
                }).fail(function() {
                    $submitBtn.prop('disabled', false).text(origText);
                    self.showToast('Package active & saved locally!', 'success');
                    $('#kt-package-modal, #kt-modal-backdrop').hide();
                });
            });

            $(document).on('click', '.btn-delete-package', function() {
                var id = $(this).data('id');
                var name = $(this).data('name');
                if (confirm('Are you sure you want to delete broadband package: ' + name + '?')) {
                    var pkgs = self.getStoredPackages().filter(function(p) { return parseInt(p.id) !== parseInt(id); });
                    self.setStoredPackages(pkgs);
                    self.renderPackagesTable(pkgs, true);
                    self.populateCustomerAndPackageSelects();

                    var u = self.getUserSession();
                    $.post(ktConfig.ajaxUrl, { action: 'kt_delete_package', nonce: ktConfig.nonce, package_id: id, current_user_id: u.user_id, current_user_name: encodeURIComponent(u.display_name), current_user_role: u.role_level }, function(res) {
                        self.showToast('Package deleted successfully!', 'success');
                        self.fetchPackages();
                        self.populateCustomerAndPackageSelects();
                    });
                }
            });

            // --- 2. CUSTOMERS MODAL & FORMS ---
            $(document).on('click', '#btn-add-customer', function(e) {
                e.preventDefault();
                self.openCreateSubscriberModal();
            });

            $(document).on('click', '.btn-edit-customer', function() {
                self.populateCustomerAndPackageSelects();
                var data = $(this).data('json');
                if (typeof data === 'string') { try { data = JSON.parse(data); } catch(e) {} }
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
                $('#kt-modal-backdrop').show();
                $('#kt-customer-modal').css('display', 'flex');
            });

            $(document).on('click', '#btn-delete-customer-modal, .btn-delete-customer', function() {
                var id = $(this).data('id') || $('#kt-customer-form input[name="id"]').val();
                var name = $(this).data('name') || $('#kt-customer-form input[name="full_name"]').val();
                if (id > 0 && confirm('Are you sure you want to delete subscriber profile: ' + name + '?')) {
                    var custs = self.getStoredCustomers().filter(function(c) { return parseInt(c.id) !== parseInt(id); });
                    self.setStoredCustomers(custs);
                    self.renderCustomersTable(custs);
                    self.populateCustomerAndPackageSelects();

                    var u = self.getUserSession();
                    $.post(ktConfig.ajaxUrl, { action: 'kt_delete_customer', nonce: ktConfig.nonce, customer_id: id, current_user_id: u.user_id, current_user_name: encodeURIComponent(u.display_name), current_user_role: u.role_level }, function(res) {
                        self.showToast('Subscriber profile deleted!', 'danger');
                        $('#kt-customer-modal, #kt-modal-backdrop').hide();
                        self.fetchCustomers();
                    });
                }
            });

            $(document).on('submit', '#kt-customer-form', function(e) {
                e.preventDefault();
                var $submitBtn = $(this).find('button[type="submit"]');
                var origText = $submitBtn.text();
                $submitBtn.prop('disabled', true).text('Saving...');

                var user = self.getUserSession();
                var formDataRaw = $(this).serializeArray();
                var formData = {};
                formDataRaw.forEach(function(item) { formData[item.name] = item.value; });

                var custs = self.getStoredCustomers();
                var pkgs = self.getStoredPackages();
                var custId = parseInt(formData.id) || 0;

                var matchedPkg = pkgs.find(function(p) { return parseInt(p.id) === parseInt(formData.package_id); }) || { package_name: 'Fiber Internet' };

                var updatedCust = {
                    id: custId > 0 ? custId : (custs.length > 0 ? Math.max.apply(null, custs.map(function(c){return parseInt(c.id);})) + 1 : 1),
                    customer_code: formData.customer_code,
                    full_name: formData.full_name,
                    phone_number: formData.phone_number,
                    cnic_id: formData.cnic_id,
                    area_sector: formData.area_sector,
                    address: formData.address,
                    package_id: formData.package_id,
                    package_name: matchedPkg.package_name,
                    assigned_ip_ipoe: formData.assigned_ip_ipoe,
                    connection_type: formData.connection_type,
                    billing_cycle_day: formData.billing_cycle_day,
                    status: formData.status || 'active',
                    activated_at: new Date().toISOString()
                };

                if (custId > 0) {
                    var idx = custs.findIndex(function(c) { return parseInt(c.id) === custId; });
                    if (idx !== -1) custs[idx] = updatedCust;
                    else custs.push(updatedCust);
                } else {
                    custs.push(updatedCust);
                }

                self.setStoredCustomers(custs);
                self.renderCustomersTable(custs);

                var postData = $(this).serialize() + '&action=kt_save_customer&nonce=' + ktConfig.nonce + '&current_user_id=' + user.user_id + '&current_user_name=' + encodeURIComponent(user.display_name) + '&current_user_role=' + user.role_level;
                $.post(ktConfig.ajaxUrl, postData, function(res) {
                    $submitBtn.prop('disabled', false).text(origText);
                    self.showToast('Subscriber saved successfully!', 'success');
                    $('#kt-customer-modal, #kt-modal-backdrop').hide();
                    self.fetchCustomers();
                    self.fetchDashboardStats(true);
                }).fail(function() {
                    $submitBtn.prop('disabled', false).text(origText);
                    self.showToast('Subscriber active & saved locally!', 'success');
                    $('#kt-customer-modal, #kt-modal-backdrop').hide();
                });
            });

            
            // Activate / Renew Subscriber Package 30-Day Cycle
            $(document).on('click', '.btn-activate-customer', function(e) {
                e.preventDefault();
                var id = $(this).data('id');
                var name = $(this).data('name');
                
                var custs = self.getStoredCustomers();
                var c = custs.find(function(item) { return parseInt(item.id) === parseInt(id); });
                if (c) {
                    c.status = 'active';
                    c.activated_at = new Date().toISOString();
                    c.days_remaining = 30;
                    self.setStoredCustomers(custs);
                    self.renderCustomersTable(custs);
                    self.showToast('Subscriber ' + name + ' 30-day package activated & renewed!', 'success');
                }

                var u = self.getUserSession();
                $.post(ktConfig.ajaxUrl, {
                    action: 'kt_activate_customer',
                    nonce: ktConfig.nonce,
                    customer_id: id,
                    current_user_id: u.user_id,
                    current_user_name: encodeURIComponent(u.display_name),
                    current_user_role: u.role_level
                }, function(res) {
                    self.fetchCustomers();
                    self.fetchDashboardStats(true);
                });
            });

            // --- 3. INVOICES & PAYMENTS HANDLERS ---
            
            // --- HTML2CANVAS THERMAL RECEIPT SLIP IMAGE DOWNLOAD ---
            $(document).on('click', '#btn-save-image-slip', function(e) {
                e.preventDefault();
                var elem = document.querySelector('.kt-thermal-slip') || document.querySelector('#receipt-preview-container');
                if (elem && window.html2canvas) {
                    html2canvas(elem, { scale: 2 }).then(function(canvas) {
                        var link = document.createElement('a');
                        link.download = 'KhanTelecom_Receipt_' + Date.now() + '.png';
                        link.href = canvas.toDataURL('image/png');
                        link.click();
                        self.showToast('Receipt image downloaded successfully!', 'success');
                    });
                } else {
                    self.showToast('Thermal slip preview ready!', 'success');
                }
            });

            // --- HARDWARE PRODUCTS HANDLERS ---
            $(document).on('submit', '#kt-product-form', function(e) {
                e.preventDefault();
                var user = self.getUserSession();
                var formDataRaw = $(this).serializeArray();
                var formData = {};
                formDataRaw.forEach(function(item) { formData[item.name] = item.value; });

                var prods = self.getStoredProducts();
                var prodId = parseInt(formData.id) || 0;
                var costPrice = parseFloat(formData.cost_price) || 0;
                var salePrice = parseFloat(formData.sale_price) || 0;
                var stockQty = parseInt(formData.stock_qty) || 1;

                var updatedProd = {
                    id: prodId > 0 ? prodId : (prods.length > 0 ? Math.max.apply(null, prods.map(function(p){return parseInt(p.id);})) + 1 : 1),
                    product_name: formData.product_name,
                    category: formData.category || 'Routers',
                    unit: formData.unit || 'pcs',
                    cost_price: costPrice,
                    sale_price: salePrice,
                    margin: Math.max(0, salePrice - costPrice),
                    stock_qty: stockQty
                };

                if (prodId > 0) {
                    var idx = prods.findIndex(function(p) { return parseInt(p.id) === prodId; });
                    if (idx !== -1) prods[idx] = updatedProd;
                    else prods.push(updatedProd);
                } else {
                    prods.push(updatedProd);
                }

                self.setStoredProducts(prods);
                self.renderProductsTable(prods);
                self.showToast('Product ' + formData.product_name + ' stock saved!', 'success');
                $('#kt-product-modal, #kt-modal-backdrop').hide();

                var postData = $(this).serialize() + '&action=kt_save_product&nonce=' + ktConfig.nonce + '&product_id=' + prodId + '&current_user_id=' + user.user_id + '&current_user_name=' + encodeURIComponent(user.display_name) + '&current_user_role=' + user.role_level;
                $.post(ktConfig.ajaxUrl, postData, function(res) {
                    self.fetchProducts();
                });
            });

            $(document).on('submit', '#kt-sell-product-form', function(e) {
                e.preventDefault();
                var user = self.getUserSession();
                var prodId = parseInt($('#sell-product-select').val());
                var custId = parseInt($('#sell-customer-select').val());
                var qty = parseInt($('#sell-qty-input').val()) || 1;

                var prods = self.getStoredProducts();
                var prod = prods.find(function(p) { return parseInt(p.id) === prodId; });
                var custs = self.getStoredCustomers();
                var cust = custs.find(function(c) { return parseInt(c.id) === custId; });

                if (prod && cust) {
                    prod.stock_qty = Math.max(0, parseInt(prod.stock_qty || 0) - qty);
                    self.setStoredProducts(prods);
                    self.renderProductsTable(prods);

                    var totalBill = (parseFloat(prod.sale_price) * qty).toFixed(2);
                    self.showToast('Sold ' + qty + 'x ' + prod.product_name + ' to ' + cust.full_name + ' (PKR ' + totalBill + ')!', 'success');
                    $('#kt-sell-product-modal, #kt-modal-backdrop').hide();

                    var cleanPhone = (cust.phone_number || '').replace(/^0/, '92');
                    var waTextRaw = '📦 *KHAN TELECOM HARDWARE EQUIPMENT RECEIPT* 📦\n----------------------------------\n*SUBSCRIBER:* ' + cust.full_name + ' (' + cust.customer_code + ')\n*ITEM BOUGHT:* ' + prod.product_name + '\n*QUANTITY:* ' + qty + ' ' + (prod.unit || 'pcs') + '\n*UNIT RETAIL PRICE:* PKR ' + parseFloat(prod.sale_price).toFixed(2) + '\n----------------------------------\n*TOTAL BILL:* PKR ' + totalBill + ' ✅\n==================================\nThank you for choosing Khan Telecom!\n*Developed by Muhammad Irfan*';
                    var waLink = 'https://wa.me/' + cleanPhone + '?text=' + encodeURIComponent(waTextRaw);
                    window.open(waLink, '_blank');

                    var postData = $(this).serialize() + '&action=kt_sell_product&nonce=' + ktConfig.nonce + '&seller_id=' + user.user_id + '&seller_name=' + encodeURIComponent(user.display_name) + '&seller_role=' + user.role_level;
                    $.post(ktConfig.ajaxUrl, postData, function(res) {
                        self.fetchProducts();
                    });
                }
            });

            $(document).on('click', '.btn-delete-product', function(e) {
                e.preventDefault();
                var id = $(this).data('id');
                var name = $(this).data('name');
                if (confirm('Are you sure you want to delete product ' + name + '?')) {
                    var prods = self.getStoredProducts().filter(function(p) { return parseInt(p.id) !== parseInt(id); });
                    self.setStoredProducts(prods);
                    self.renderProductsTable(prods);
                    self.showToast('Product ' + name + ' deleted!', 'danger');

                    var u = self.getUserSession();
                    $.post(ktConfig.ajaxUrl, { action: 'kt_delete_product', nonce: ktConfig.nonce, product_id: id, current_user_id: u.user_id, current_user_name: encodeURIComponent(u.display_name), current_user_role: u.role_level }, function(res) {
                        self.fetchProducts();
                    });
                }
            });

            $(document).on('click', '.btn-sell-product-row', function(e) {
                e.preventDefault();
                var id = $(this).data('id');
                self.openSellProductModal();
                $('#sell-product-select').val(id).trigger('change');
            });

            // --- INVOICE TOGGLE & DELETE HANDLERS ---
            $(document).on('click', '.btn-toggle-inv-status', function(e) {
                e.preventDefault();
                var id = $(this).data('id');
                var status = $(this).data('status');
                var invs = self.getStoredInvoices();
                var inv = invs.find(function(i) { return parseInt(i.id) === parseInt(id); });
                if (inv) {
                    inv.payment_status = status;
                    if (status === 'paid') inv.paid_at = new Date().toLocaleString();
                    self.setStoredInvoices(invs);
                    self.renderInvoicesTable(invs);
                    self.showToast('Invoice ' + inv.invoice_number + ' status set to ' + status.toUpperCase(), 'success');
                }
                var u = self.getUserSession();
                $.post(ktConfig.ajaxUrl, {
                    action: 'kt_toggle_invoice_status',
                    nonce: ktConfig.nonce,
                    invoice_id: id,
                    payment_status: status,
                    current_user_id: u.user_id,
                    current_user_name: encodeURIComponent(u.display_name),
                    current_user_role: u.role_level
                }, function(res) {
                    self.fetchInvoices();
                    self.fetchDashboardStats(true);
                });
            });

            $(document).on('click', '.btn-delete-invoice', function(e) {
                e.preventDefault();
                var id = $(this).data('id');
                var no = $(this).data('no');
                if (confirm('Are you sure you want to delete invoice ' + no + '?')) {
                    var invs = self.getStoredInvoices().filter(function(i) { return parseInt(i.id) !== parseInt(id); });
                    self.setStoredInvoices(invs);
                    self.renderInvoicesTable(invs);
                    self.showToast('Invoice ' + no + ' deleted!', 'danger');

                    var u = self.getUserSession();
                    $.post(ktConfig.ajaxUrl, {
                        action: 'kt_delete_invoice',
                        nonce: ktConfig.nonce,
                        invoice_id: id,
                        current_user_id: u.user_id,
                        current_user_name: encodeURIComponent(u.display_name),
                        current_user_role: u.role_level
                    }, function(res) {
                        self.fetchInvoices();
                        self.fetchDashboardStats(true);
                    });
                }
            });

            $(document).on('click', '#btn-create-invoice', function() {
                var custs = self.getStoredCustomers();
                var opts = '<option value="">-- Select Subscriber --</option>';
                custs.forEach(function(c) {
                    opts += '<option value="' + c.id + '">' + c.full_name + ' (' + c.customer_code + ' - ' + c.area_sector + ')</option>';
                });
                $('#invoice-customer-select').html(opts);
                $('#kt-invoice-form')[0].reset();
                $('#kt-modal-backdrop').show();
                $('#kt-invoice-modal').css('display', 'flex');
            });

            $(document).on('submit', '#kt-invoice-form', function(e) {
                e.preventDefault();
                var user = self.getUserSession();
                var postData = $(this).serialize() + '&action=kt_create_invoice&nonce=' + ktConfig.nonce + '&current_user_id=' + user.user_id + '&current_user_name=' + encodeURIComponent(user.display_name) + '&current_user_role=' + user.role_level;
                $.post(ktConfig.ajaxUrl, postData, function(res) {
                    self.showToast('Invoice generated successfully!', 'success');
                    $('#kt-invoice-modal, #kt-modal-backdrop').hide();
                    self.fetchInvoices();
                });
            });

            $(document).on('click', '.btn-collect-pay', function() {
                var id = $(this).data('id');
                var name = $(this).data('name');
                var due = $(this).data('due');
                $('#pay-invoice-id').val(id);
                $('#pay-customer-name').text(name);
                $('#pay-due-amount').text('Due: PKR ' + parseFloat(due).toFixed(2));
                $('#pay-amount-input').val(due);
                $('#kt-modal-backdrop').show();
                $('#kt-payment-modal').css('display', 'flex');
            });

            $(document).on('submit', '#kt-payment-form', function(e) {
                e.preventDefault();
                var user = self.getUserSession();
                var postData = $(this).serialize() + '&action=kt_collect_payment&nonce=' + ktConfig.nonce + '&collector_id=' + user.user_id + '&collector_name=' + encodeURIComponent(user.display_name) + '&collector_role=' + user.role_level;
                $.post(ktConfig.ajaxUrl, postData, function(res) {
                    self.showToast('Payment collected & slip ready!', 'success');
                    $('#kt-payment-modal, #kt-modal-backdrop').hide();
                    self.fetchInvoices();
                    if (res && res.success && res.data && res.data.invoice_id) {
                        self.openReceiptModal(res.data.invoice_id, 'invoice');
                    }
                });
            });

            $(document).on('click', '.btn-view-receipt', function() {
                var invId = $(this).data('id');
                self.openReceiptModal(invId, 'invoice');
            });

            $(document).on('click', '.btn-view-ledger', function() {
                var custId = $(this).data('id');
                self.openLedgerModal(custId);
            });

            $(document).on('click', '.metric-card-clickable', function() {
                var view = $(this).data('view');
                var filter = $(this).data('filter');
                if (view) {
                    window.location.hash = view;
                    self.switchView(view, filter);
                }
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
                } else if (self.currentView === 'packages') {
                    self.fetchPackages();
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
                    <div id="financial-profit-card" class="metric-card metric-card-clickable" data-view="packages" data-filter="" style="display:flex; border-color: var(--accent);" title="Click to view ISP Packages">
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
                $('#financial-profit-card').show().css('display', 'flex');
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
                    <button id="btn-add-customer" onclick="KT_App.openCreateSubscriberModal()" class="btn btn-primary">➕ Register New Subscriber</button>
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
                        if (!match) {
                            localCusts.push(sc);
                        } else {
                            match.status = sc.status;
                            match.days_remaining = sc.days_remaining;
                            match.expiry_date = sc.expiry_date;
                            match.activated_at = sc.activated_at;
                            match.package_name = sc.package_name;
                        }
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
                    <button id="btn-add-package" onclick="KT_App.openCreatePackageModal()" class="btn btn-primary">➕ Create New Package</button>
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
                        <button id="btn-add-product" onclick="KT_App.openCreateProductModal()" class="btn btn-primary">➕ Buy / Add Stock Entry</button>
                        <button id="btn-sell-product-modal-open" onclick="KT_App.openSellProductModal()" class="btn btn-success">🛒 Sell Hardware to Subscriber</button>
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
                                '<button class="btn btn-sm btn-secondary btn-edit-product" onclick="KT_App.openEditProductModal(this)" data-json=\'' + JSON.stringify(p) + '\'>✏️ Edit</button>' +
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
                    <button id="btn-create-invoice" onclick="KT_App.openCreateInvoiceModal()" class="btn btn-primary">📄 Generate Invoice</button>
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


    window.KT_App = KT_App;
    $(document).ready(function() {
        KT_App.init();
    });

})(jQuery);
