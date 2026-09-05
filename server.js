const http = require('http');
const fs = require('fs');
const path = require('path');
const querystring = require('querystring');

const PORT = 3000;

// In-Memory Database Store for Demo Web Server
let activityLogs = [
    { id: 1, user_id: 1, user_name: 'Muhammad Irfan', role_level: 'super_admin', action_type: 'system_init', description: 'Khan Telecom ISP Management Engine initialized.', created_at: '2026-09-05 10:00:00' },
    { id: 2, user_id: 1, user_name: 'Muhammad Irfan', role_level: 'super_admin', action_type: 'invoice_generated', description: 'Generated invoice INV-202609-0001 for Muhammad Ali Shah', created_at: '2026-09-05 10:15:00' },
    { id: 3, user_id: 2, user_name: 'Field Recovery Agent', role_level: 'employee', action_type: 'payment_collected', description: 'Collected PKR 2200.00 for invoice INV-202609-0001 via Cash Settlement', created_at: '2026-09-05 14:15:00' }
];

let packages = [
    { id: 1, package_name: '10 Mbps Fiber Basic', speed_mbps: 10, cost_price: 800.00, sale_price: 1500.00, margin: 700.00, status: 'active' },
    { id: 2, package_name: '20 Mbps Fiber Pro', speed_mbps: 20, cost_price: 1200.00, sale_price: 2200.00, margin: 1000.00, status: 'active' },
    { id: 3, package_name: '50 Mbps Ultra Gaming', speed_mbps: 50, cost_price: 2500.00, sale_price: 4500.00, margin: 2000.00, status: 'active' }
];

let products = [
    { id: 1, product_name: 'Dual Band AC1200 WiFi Router', category: 'Routers', cost_price: 4500.00, sale_price: 6500.00, margin: 2000.00, stock_qty: 25, unit: 'pcs' },
    { id: 2, product_name: 'Fiber Optic Drop Cable 2-Core', category: 'Cables', cost_price: 18.00, sale_price: 30.00, margin: 12.00, stock_qty: 1000, unit: 'meters' },
    { id: 3, product_name: 'XPON Fiber ONU Node Device', category: 'ONU/ONT', cost_price: 2200.00, sale_price: 3500.00, margin: 1300.00, stock_qty: 15, unit: 'pcs' },
    { id: 4, product_name: 'Cat6 Ethernet Cable (Pre-Made 3M)', category: 'Accessories', cost_price: 250.00, sale_price: 500.00, margin: 250.00, stock_qty: 40, unit: 'pcs' }
];

let customers = [
    { id: 1, customer_code: 'KT-1001', full_name: 'Muhammad Ali Shah', phone_number: '03001234567', cnic_id: '35202-1234567-1', area_sector: 'Sector F-11', package_id: 2, package_name: '20 Mbps Fiber Pro', assigned_ip_ipoe: '192.168.10.15', status: 'active', activated_at: new Date(Date.now() - 5 * 86400000).toISOString() },
    { id: 2, customer_code: 'KT-1002', full_name: 'Tariq Mehmood Khan', phone_number: '03219876543', cnic_id: '35202-7654321-3', area_sector: 'Phase 4, DHA', package_id: 3, package_name: '50 Mbps Ultra Gaming', assigned_ip_ipoe: '192.168.10.22', status: 'active', activated_at: new Date(Date.now() - 10 * 86400000).toISOString() },
    { id: 3, customer_code: 'KT-1003', full_name: 'Usman Ghani', phone_number: '03335554433', cnic_id: '35202-9988776-5', area_sector: 'Sector G-9', package_id: 1, package_name: '10 Mbps Fiber Basic', assigned_ip_ipoe: '192.168.10.30', status: 'suspended', activated_at: new Date(Date.now() - 35 * 86400000).toISOString() }
];

let invoices = [
    { id: 1, invoice_number: 'INV-202609-0001', customer_id: 1, full_name: 'Muhammad Ali Shah', customer_code: 'KT-1001', phone_number: '03001234567', area_sector: 'Sector F-11', billing_month: '2026-09', amount_due: 2200.00, amount_paid: 2200.00, discount: 0.00, payment_status: 'paid', payment_method: 'cash', collector_name: 'Field Recovery Agent', paid_at: '2026-09-05 02:15 PM' },
    { id: 2, invoice_number: 'INV-202609-0002', customer_id: 2, full_name: 'Tariq Mehmood Khan', customer_code: 'KT-1002', phone_number: '03219876543', area_sector: 'Phase 4, DHA', billing_month: '2026-09', amount_due: 4500.00, amount_paid: 0.00, discount: 0.00, payment_status: 'unpaid', payment_method: 'cash', collector_name: null, paid_at: null }
];

let matrix = [
    { 
        user_id: 1, 
        user_login: 'irfan', 
        user_pass: 'admin123', 
        display_name: 'Muhammad Irfan', 
        user_email: 'irfan@khantelecom.com', 
        permissions: { 
            role_level: 'super_admin', 
            can_view_financials: 1, 
            can_create_invoice: 1, 
            can_collect_payment: 1, 
            can_edit_packages: 1, 
            can_manage_customers: 1, 
            can_export_reports: 1, 
            approval_status: 'approved' 
        } 
    }
];

let productSales = [
    { id: 1, product_name: 'Dual Band AC1200 WiFi Router', customer_name: 'Muhammad Ali Shah', quantity: 1, total_sale: 6500.00, profit: 2000.00, sold_by: 'Muhammad Irfan', date: '2026-09-05 11:30 AM' }
];

const server = http.createServer((req, res) => {
    const url = req.url.split('?')[0];

    // Serve API Endpoints
    if (req.method === 'POST' && url === '/api/ajax') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            const data = querystring.parse(body);
            const action = data.action;

            res.setHeader('Content-Type', 'application/json');

            const activeUser = data.current_user_name || 'Muhammad Irfan';
            const activeUserId = parseInt(data.current_user_id) || 1;
            const activeRole = data.current_user_role || 'super_admin';

            if (action === 'kt_change_superadmin_password') {
                const newUsername = (data.new_username || '').trim();
                const newPassword = data.new_password || '';
                const confirmPassword = data.confirm_password || '';

                if (!newPassword) {
                    res.end(JSON.stringify({ success: false, data: { message: 'Please enter a new password.' } }));
                    return;
                }

                if (newPassword !== confirmPassword) {
                    res.end(JSON.stringify({ success: false, data: { message: 'New password and confirm password do not match.' } }));
                    return;
                }

                const superAdmin = matrix.find(m => m.permissions.role_level === 'super_admin');
                if (superAdmin) {
                    if (newUsername) superAdmin.user_login = newUsername;
                    superAdmin.user_pass = newPassword;

                    activityLogs.unshift({
                        id: activityLogs.length + 1,
                        user_id: superAdmin.user_id,
                        user_name: superAdmin.display_name,
                        role_level: 'super_admin',
                        action_type: 'security_password_change',
                        description: `Super Admin updated login credentials (Username: ${superAdmin.user_login}).`,
                        created_at: new Date().toLocaleString()
                    });

                    res.end(JSON.stringify({
                        success: true,
                        data: {
                            message: '🔑 Super Admin password updated successfully! Please use your new credentials for future logins.',
                            updated_user: {
                                user_id: superAdmin.user_id,
                                user_login: superAdmin.user_login,
                                display_name: superAdmin.display_name,
                                role_level: 'super_admin',
                                permissions: superAdmin.permissions
                            }
                        }
                    }));
                } else {
                    res.end(JSON.stringify({ success: false, data: { message: 'Super Admin account not found.' } }));
                }
            } else if (action === 'kt_login') {
                const log = (data.log || '').trim();
                const pwd = data.pwd || '';

                const staff = matrix.find(m => m.user_login === log && m.user_pass === pwd);

                if (!staff) {
                    res.end(JSON.stringify({ success: false, data: { message: 'Invalid Username or Password. Please try again.' } }));
                } else if (staff.permissions.approval_status === 'pending_approval') {
                    res.end(JSON.stringify({ success: false, data: { message: '⏳ Account Access Pending! Your account is awaiting Super Admin approval.' } }));
                } else if (staff.permissions.approval_status === 'revoked') {
                    res.end(JSON.stringify({ success: false, data: { message: '⛔ Access Revoked! Your account access has been disabled by Super Admin.' } }));
                } else {
                    activityLogs.unshift({
                        id: activityLogs.length + 1,
                        user_id: staff.user_id,
                        user_name: staff.display_name,
                        role_level: staff.permissions.role_level,
                        action_type: 'user_login',
                        description: `Logged into portal. Role: ${staff.permissions.role_level.toUpperCase()}`,
                        created_at: new Date().toLocaleString()
                    });

                    res.end(JSON.stringify({
                        success: true,
                        data: {
                            message: `Welcome back, ${staff.display_name}!`,
                            user: {
                                user_id: staff.user_id,
                                user_login: staff.user_login,
                                display_name: staff.display_name,
                                role_level: staff.permissions.role_level,
                                permissions: staff.permissions
                            },
                            redirect: '#dashboard'
                        }
                    }));
                }
            } else if (action === 'kt_register_staff_request') {
                const username = (data.username || '').trim();
                const fullname = (data.fullname || '').trim();
                const email    = (data.email || '').trim();
                const password = data.password || 'staff123';
                const role     = data.role_level || 'employee';

                if (!username || !fullname) {
                    res.end(JSON.stringify({ success: false, data: { message: 'Please enter full name and username.' } }));
                    return;
                }

                const exists = matrix.find(m => m.user_login === username);
                if (exists) {
                    res.end(JSON.stringify({ success: false, data: { message: 'Username already taken. Please choose another.' } }));
                    return;
                }

                const newUser = {
                    user_id: matrix.length + 1,
                    user_login: username,
                    user_pass: password,
                    display_name: fullname,
                    user_email: email || `${username}@khantelecom.com`,
                    permissions: {
                        role_level: role,
                        can_view_financials: role === 'super_admin' || role === 'admin' ? 1 : 0,
                        can_create_invoice: 1,
                        can_collect_payment: 1,
                        can_edit_packages: role === 'super_admin' || role === 'admin' ? 1 : 0,
                        can_manage_customers: 1,
                        can_export_reports: role === 'super_admin' ? 1 : 0,
                        approval_status: 'pending_approval'
                    }
                };

                matrix.push(newUser);

                activityLogs.unshift({
                    id: activityLogs.length + 1,
                    user_id: newUser.user_id,
                    user_name: newUser.display_name,
                    role_level: role,
                    action_type: 'staff_register_request',
                    description: `Submitted registration request for role [${role.toUpperCase()}]. Status: Pending Super Admin Approval.`,
                    created_at: new Date().toLocaleString()
                });

                res.end(JSON.stringify({
                    success: true,
                    data: { message: 'Registration Request Submitted! Please wait for Super Admin approval before logging in.' }
                }));
            } else if (action === 'kt_get_dashboard_stats') {
                function checkSubscriberAutoExpiry() {
                    const now = Date.now();
                    const msInDay = 86400000;
                    customers.forEach(c => {
                        if (!c.activated_at) {
                            const daysAgo = (c.status === 'active') ? 5 : 35;
                            c.activated_at = new Date(now - daysAgo * msInDay).toISOString();
                        }
                        const actTime = new Date(c.activated_at).getTime();
                        const elapsedDays = Math.floor((now - actTime) / msInDay);
                        const daysLeft = Math.max(0, 30 - elapsedDays);

                        c.days_remaining = daysLeft;
                        c.expiry_date = new Date(actTime + 30 * msInDay).toISOString().split('T')[0];

                        // Auto Expire Package after 30 days!
                        if (elapsedDays >= 30 && c.status === 'active') {
                            c.status = 'expired';
                        }
                    });
                }

                checkSubscriberAutoExpiry();

                const totalCust = customers.length;
                const activeCust = customers.filter(c => c.status === 'active').length;
                const inactiveCust = customers.filter(c => c.status !== 'active').length;
                
                // Aggregate Fee Invoices
                const invoicePaidToday = invoices.filter(i => i.payment_status === 'paid').reduce((sum, i) => sum + parseFloat(i.amount_paid), 0);
                const invoiceMonthlyRev = invoices.filter(i => i.payment_status === 'paid').reduce((sum, i) => sum + parseFloat(i.amount_paid), 0);
                const pendingDues = invoices.filter(i => i.payment_status !== 'paid').reduce((sum, i) => sum + parseFloat(i.amount_due - i.amount_paid), 0);

                // Aggregate Hardware Product Sales
                const hardwareSalesToday = productSales.reduce((sum, s) => sum + parseFloat(s.total_sale), 0);
                const hardwareSalesMonthly = productSales.reduce((sum, s) => sum + parseFloat(s.total_sale), 0);
                const hardwareProfitMonthly = productSales.reduce((sum, s) => sum + parseFloat(s.profit), 0);

                // Total Real-Time Aggregations
                const todayCollected = invoicePaidToday + hardwareSalesToday;
                const totalMonthlyRev = invoiceMonthlyRev + hardwareSalesMonthly;

                // Upstream Cost Calculation
                const upstreamCost = customers.filter(c => c.status === 'active').reduce((sum, c) => {
                    const pkg = packages.find(p => p.id == c.package_id);
                    return sum + (pkg ? parseFloat(pkg.cost_price) : 0);
                }, 0);

                const netProfit = Math.max(0, (invoiceMonthlyRev - upstreamCost) + hardwareProfitMonthly);

                // Combined Recent Activities
                const recentActivities = [];
                invoices.filter(i => i.payment_status === 'paid').forEach(i => {
                    recentActivities.push({
                        invoice_number: i.invoice_number,
                        full_name: i.full_name,
                        customer_code: i.customer_code,
                        amount_paid: i.amount_paid,
                        payment_method: i.payment_method + ' (Fee Recovery)',
                        paid_at: i.paid_at || i.created_at
                    });
                });
                productSales.forEach(s => {
                    recentActivities.push({
                        invoice_number: 'SALE-HW',
                        full_name: s.customer_name + ' (' + s.product_name + ')',
                        customer_code: 'EQP-' + s.quantity,
                        amount_paid: s.total_sale,
                        payment_method: 'Hardware Sale',
                        paid_at: s.date
                    });
                });

                res.end(JSON.stringify({
                    success: true,
                    data: {
                        total_customers: totalCust,
                        active_customers: activeCust,
                        inactive_customers: inactiveCust,
                        today_collected: todayCollected.toFixed(2),
                        monthly_revenue: totalMonthlyRev.toFixed(2),
                        pending_dues: pendingDues.toFixed(2),
                        financials: {
                            can_view: true,
                            total_cost: upstreamCost.toFixed(2),
                            total_profit: netProfit.toFixed(2)
                        },
                        recent_collections: recentActivities.slice(0, 8)
                    }
                }));
            } else if (action === 'kt_get_customers') {
                const now = Date.now();
                const msInDay = 86400000;
                customers.forEach(c => {
                    if (!c.activated_at) {
                        const daysAgo = (c.status === 'active') ? 5 : 35;
                        c.activated_at = new Date(now - daysAgo * msInDay).toISOString();
                    }
                    const actTime = new Date(c.activated_at).getTime();
                    const elapsedDays = Math.floor((now - actTime) / msInDay);
                    const daysLeft = Math.max(0, 30 - elapsedDays);

                    c.days_remaining = daysLeft;
                    c.expiry_date = new Date(actTime + 30 * msInDay).toISOString().split('T')[0];

                    if (elapsedDays >= 30 && c.status === 'active') {
                        c.status = 'expired';
                    }
                });

                const search = (data.search || '').toLowerCase().trim();
                const statusFilter = (data.status || '').toLowerCase().trim();

                const filtered = customers.filter(c => {
                    const matchSearch = !search || 
                        c.full_name.toLowerCase().includes(search) || 
                        c.customer_code.toLowerCase().includes(search) || 
                        c.phone_number.toLowerCase().includes(search) || 
                        c.area_sector.toLowerCase().includes(search);

                    let matchStatus = true;
                    if (statusFilter === 'active') {
                        matchStatus = (c.status === 'active');
                    } else if (statusFilter === 'inactive') {
                        matchStatus = (c.status !== 'active'); // Expired, suspended, pending grouped in Inactive
                    } else if (statusFilter) {
                        matchStatus = (c.status === statusFilter);
                    }

                    return matchSearch && matchStatus;
                });

                const activeCount = customers.filter(c => c.status === 'active').length;
                const inactiveCount = customers.filter(c => c.status !== 'active').length;
                const totalCount = customers.length;

                res.end(JSON.stringify({
                    success: true,
                    data: {
                        customers: filtered,
                        counts: {
                            total: totalCount,
                            active: activeCount,
                            inactive: inactiveCount
                        }
                    }
                }));
            } else if (action === 'kt_save_customer') {
                const id = parseInt(data.id) || 0;
                const pkg = packages.find(p => p.id == data.package_id);
                const newStatus = data.status || 'active';
                const userCode = (data.customer_code || '').trim();

                if (id > 0) {
                    const cust = customers.find(c => c.id === id);
                    if (cust) {
                        if (userCode) cust.customer_code = userCode;
                        cust.full_name = data.full_name;
                        cust.phone_number = data.phone_number;
                        cust.cnic_id = data.cnic_id;
                        cust.area_sector = data.area_sector;
                        cust.package_id = parseInt(data.package_id);
                        cust.package_name = pkg ? pkg.package_name : 'Custom';
                        cust.assigned_ip_ipoe = data.assigned_ip_ipoe;

                        if (newStatus === 'active' && cust.status !== 'active') {
                            cust.activated_at = new Date().toISOString(); // Start/Renew 30-day cycle
                        }
                        cust.status = newStatus;
                    }
                    activityLogs.unshift({ id: activityLogs.length + 1, user_id: activeUserId, user_name: activeUser, role_level: activeRole, action_type: 'subscriber_update', description: 'Updated subscriber profile: ' + data.full_name + ' [Code: ' + (userCode || cust.customer_code) + ']', created_at: new Date().toLocaleString() });
                } else {
                    const code = userCode || ('KT-' + (customers.length + 1001));
                    customers.unshift({
                        id: customers.length + 1,
                        customer_code: code,
                        full_name: data.full_name,
                        phone_number: data.phone_number,
                        cnic_id: data.cnic_id,
                        area_sector: data.area_sector,
                        package_id: parseInt(data.package_id),
                        package_name: pkg ? pkg.package_name : 'Custom',
                        assigned_ip_ipoe: data.assigned_ip_ipoe || '192.168.10.99',
                        status: newStatus,
                        activated_at: new Date().toISOString()
                    });
                    activityLogs.unshift({ id: activityLogs.length + 1, user_id: activeUserId, user_name: activeUser, role_level: activeRole, action_type: 'subscriber_register', description: 'Registered new subscriber ' + data.full_name + ' (' + code + ') with 30-Day active package.', created_at: new Date().toLocaleString() });
                }
                res.end(JSON.stringify({ success: true, data: { message: 'Subscriber profile saved successfully!' } }));
            } else if (action === 'kt_get_packages') {
                res.end(JSON.stringify({ success: true, data: { packages, can_edit: true } }));
            } else if (action === 'kt_save_package') {
                const id = parseInt(data.id) || 0;
                const cost = parseFloat(data.cost_price) || 0;
                const sale = parseFloat(data.sale_price) || 0;
                const margin = Math.max(0, sale - cost);

                if (id > 0) {
                    const pkg = packages.find(p => p.id === id);
                    if (pkg) {
                        pkg.package_name = data.package_name;
                        pkg.speed_mbps = parseInt(data.speed_mbps);
                        pkg.cost_price = cost;
                        pkg.sale_price = sale;
                        pkg.margin = margin;
                        pkg.status = data.status;
                    }
                } else {
                    packages.push({
                        id: packages.length + 1,
                        package_name: data.package_name,
                        speed_mbps: parseInt(data.speed_mbps),
                        cost_price: cost,
                        sale_price: sale,
                        margin: margin,
                        status: data.status || 'active'
                    });
                }
                activityLogs.unshift({ id: activityLogs.length + 1, user_id: activeUserId, user_name: activeUser, role_level: activeRole, action_type: 'package_modify', description: 'Updated ISP package tier: ' + data.package_name, created_at: new Date().toLocaleString() });
                res.end(JSON.stringify({ success: true, data: { message: 'Package tier saved successfully!' } }));
            } else if (action === 'kt_get_invoices') {
                const search = (data.search || '').toLowerCase().trim();
                const statusFilter = (data.status || '').toLowerCase().trim();

                const filteredInvoices = invoices.filter(i => {
                    const matchSearch = !search ||
                        (i.invoice_number && i.invoice_number.toLowerCase().includes(search)) ||
                        (i.full_name && i.full_name.toLowerCase().includes(search)) ||
                        (i.customer_code && i.customer_code.toLowerCase().includes(search)) ||
                        (i.phone_number && i.phone_number.toLowerCase().includes(search));

                    let matchStatus = true;
                    if (statusFilter) {
                        matchStatus = (i.payment_status && i.payment_status.toLowerCase() === statusFilter);
                    }

                    return matchSearch && matchStatus;
                });

                res.end(JSON.stringify({ success: true, data: { invoices: filteredInvoices } }));
            } else if (action === 'kt_create_invoice') {
                const cust = customers.find(c => c.id == data.customer_id);
                const pkg = packages.find(p => p.id == (cust ? cust.package_id : 1));
                const due = pkg ? pkg.sale_price : 2000.00;
                const invNo = 'INV-' + data.billing_month.replace('-', '') + '-000' + (invoices.length + 1);

                invoices.unshift({
                    id: invoices.length + 1,
                    invoice_number: invNo,
                    customer_id: cust ? cust.id : 1,
                    full_name: cust ? cust.full_name : 'Subscriber',
                    customer_code: cust ? cust.customer_code : 'KT-1001',
                    phone_number: cust ? cust.phone_number : '03001234567',
                    area_sector: cust ? cust.area_sector : 'Sector F-11',
                    billing_month: data.billing_month,
                    amount_due: due,
                    amount_paid: 0.00,
                    discount: 0.00,
                    payment_status: 'unpaid',
                    payment_method: 'cash',
                    paid_at: null
                });
                activityLogs.unshift({ id: activityLogs.length + 1, user_id: activeUserId, user_name: activeUser, role_level: activeRole, action_type: 'invoice_generated', description: 'Generated invoice ' + invNo + ' for ' + (cust ? cust.full_name : 'Subscriber'), created_at: new Date().toLocaleString() });
                res.end(JSON.stringify({ success: true, data: { message: 'Invoice ' + invNo + ' generated!' } }));
            } else if (action === 'kt_collect_payment') {
                const invId = parseInt(data.invoice_id);
                const inv = invoices.find(i => i.id === invId);
                if (inv) {
                    inv.amount_paid = parseFloat(data.amount_paid);
                    inv.discount = parseFloat(data.discount) || 0;
                    inv.payment_status = 'paid';
                    inv.payment_method = data.payment_method || 'cash';
                    inv.collector_name = activeUser;
                    inv.paid_at = new Date().toLocaleString();

                    // Auto-renew 30-day package on fee collection!
                    if (inv.customer_id) {
                        const cust = customers.find(c => c.id === inv.customer_id);
                        if (cust) {
                            cust.status = 'active';
                            cust.activated_at = new Date().toISOString();
                        }
                    }
                }
                activityLogs.unshift({ id: activityLogs.length + 1, user_id: activeUserId, user_name: activeUser, role_level: activeRole, action_type: 'payment_collected', description: 'Collected PKR ' + data.amount_paid + ' for invoice ' + (inv ? inv.invoice_number : invId) + ' via ' + (data.payment_method || 'cash') + ' [Auto 30-Day Package Renewed]', created_at: new Date().toLocaleString() });
                res.end(JSON.stringify({ success: true, data: { message: 'Payment collected successfully & 30-Day package renewed!', invoice_id: invId } }));
            } else if (action === 'kt_get_activity_logs') {
                res.end(JSON.stringify({ success: true, data: { logs: activityLogs } }));
            } else if (action === 'kt_get_customer_history') {
                const custId = parseInt(data.customer_id);
                const cust = customers.find(c => c.id === custId) || customers[0];
                const custInvoices = invoices.filter(i => i.customer_id === custId);
                const totalDue = custInvoices.reduce((sum, i) => sum + parseFloat(i.amount_due), 0);
                const totalPaid = custInvoices.reduce((sum, i) => sum + parseFloat(i.amount_paid), 0);

                res.end(JSON.stringify({
                    success: true,
                    data: {
                        customer: cust,
                        history: custInvoices,
                        total_due: totalDue.toFixed(2),
                        total_paid: totalPaid.toFixed(2),
                        balance: Math.max(0, totalDue - totalPaid).toFixed(2)
                    }
                }));
            } else if (action === 'kt_get_receipt_data') {
                const receiptType = data.receipt_type || 'invoice';
                let thermalHtml = '';
                let waTextRaw = '';
                let cleanPhone = '923001234567';

                if (receiptType === 'sale') {
                    const saleId = parseInt(data.sale_id || data.invoice_id);
                    const sale = productSales.find(s => s.id === saleId) || productSales[0];
                    const cust = customers.find(c => c.full_name === sale.customer_name) || customers[0];
                    const prod = products.find(p => p.product_name === sale.product_name) || products[0];

                    const saleNo = 'SALE-' + String(sale.id).padStart(4, '0');
                    const unitPrice = prod ? prod.sale_price : (sale.total_sale / Math.max(1, sale.quantity));
                    cleanPhone = (cust.phone_number || '03001234567').replace(/^0/, '92');

                    thermalHtml = `
                        <div class="kt-thermal-slip">
                            <div class="slip-header">
                                <h2>KHAN TELECOM</h2>
                                <p class="slip-subtitle">HARDWARE & EQUIPMENT RECEIPT</p>
                                <div class="slip-divider">--------------------------------</div>
                            </div>
                            <div class="slip-body">
                                <div class="slip-row"><span>Receipt No:</span> <strong>${saleNo}</strong></div>
                                <div class="slip-row"><span>Date:</span> <span>${sale.date}</span></div>
                                <div class="slip-row"><span>Customer ID:</span> <strong>${cust.customer_code}</strong></div>
                                <div class="slip-row"><span>Customer Name:</span> <span>${cust.full_name}</span></div>
                                <div class="slip-row"><span>Phone:</span> <span>${cust.phone_number}</span></div>
                                <div class="slip-row"><span>Area/Sector:</span> <span>${cust.area_sector}</span></div>
                                <div class="slip-divider">--------------------------------</div>
                                <div class="slip-row"><span>Item:</span> <strong>${sale.product_name}</strong></div>
                                <div class="slip-row"><span>Qty:</span> <span>${sale.quantity} ${prod ? prod.unit : 'pcs'}</span></div>
                                <div class="slip-row"><span>Unit Price:</span> <span>PKR ${parseFloat(unitPrice).toFixed(2)}</span></div>
                                <div class="slip-row slip-total"><span>Total Paid:</span> <strong>PKR ${parseFloat(sale.total_sale).toFixed(2)}</strong></div>
                                <div class="slip-row"><span>Payment Method:</span> <span>CASH SETTLEMENT</span></div>
                                <div class="slip-row"><span>Status:</span> <strong class="badge-paid">PAID</strong></div>
                                <div class="slip-divider">--------------------------------</div>
                                <div class="slip-row"><span>Sold By:</span> <span>${sale.sold_by || activeUser}</span></div>
                            </div>
                            <div class="slip-footer">
                                <p>Thank you for choosing Khan Telecom!</p>
                                <p class="slip-credits">D & D By Muhammad Irfan</p>
                            </div>
                        </div>
                    `;

                    waTextRaw = `⚡ *KHAN TELECOM* ⚡\n_HARDWARE & EQUIPMENT RECEIPT_\n----------------------------------\n*RECEIPT NO:* ${saleNo}\n*DATE:* ${sale.date}\n*SUBSCRIBER ID:* ${cust.customer_code}\n*NAME:* ${cust.full_name}\n*PHONE:* ${cust.phone_number}\n*AREA:* ${cust.area_sector}\n----------------------------------\n*ITEM:* ${sale.product_name}\n*QUANTITY:* ${sale.quantity} ${prod ? prod.unit : 'pcs'}\n*UNIT PRICE:* PKR ${parseFloat(unitPrice).toFixed(2)}\n*TOTAL PAID:* PKR ${parseFloat(sale.total_sale).toFixed(2)}\n*PAYMENT METHOD:* CASH SETTLEMENT\n*STATUS:* PAID ✅\n----------------------------------\n*SOLD BY:* ${sale.sold_by || activeUser}\n==================================\nThank you for choosing Khan Telecom!\n*D & D By Muhammad Irfan*`;

                } else {
                    const invId = parseInt(data.invoice_id);
                    const inv = invoices.find(i => i.id === invId) || invoices[0];
                    const cust = customers.find(c => c.id === inv.customer_id) || customers[0];
                    const pkg = packages.find(p => p.id === cust.package_id) || packages[0];
                    cleanPhone = (cust.phone_number || '03001234567').replace(/^0/, '92');

                    thermalHtml = `
                        <div class="kt-thermal-slip">
                            <div class="slip-header">
                                <h2>KHAN TELECOM</h2>
                                <p class="slip-subtitle">HIGH-SPEED BROADBAND PROVIDER</p>
                                <div class="slip-divider">--------------------------------</div>
                            </div>
                            <div class="slip-body">
                                <div class="slip-row"><span>Invoice No:</span> <strong>${inv.invoice_number}</strong></div>
                                <div class="slip-row"><span>Date:</span> <span>${inv.paid_at || 'Just Now'}</span></div>
                                <div class="slip-row"><span>Customer ID:</span> <strong>${cust.customer_code}</strong></div>
                                <div class="slip-row"><span>Customer Name:</span> <span>${cust.full_name}</span></div>
                                <div class="slip-row"><span>Phone:</span> <span>${cust.phone_number}</span></div>
                                <div class="slip-row"><span>Area/Sector:</span> <span>${cust.area_sector}</span></div>
                                <div class="slip-divider">--------------------------------</div>
                                <div class="slip-row"><span>Package:</span> <strong>${pkg.package_name}</strong></div>
                                <div class="slip-row"><span>Billing Month:</span> <span>${inv.billing_month}</span></div>
                                <div class="slip-row"><span>Amount Due:</span> <span>PKR ${parseFloat(inv.amount_due).toFixed(2)}</span></div>
                                <div class="slip-row slip-total"><span>Amount Paid:</span> <strong>PKR ${parseFloat(inv.amount_paid).toFixed(2)}</strong></div>
                                <div class="slip-row"><span>Payment Method:</span> <span>${inv.payment_method.toUpperCase().replace('_', ' ')}</span></div>
                                <div class="slip-row"><span>Status:</span> <strong class="badge-paid">PAID</strong></div>
                                <div class="slip-divider">--------------------------------</div>
                                <div class="slip-row"><span>Collector:</span> <span>${inv.collector_name || activeUser}</span></div>
                            </div>
                            <div class="slip-footer">
                                <p>Thank you for choosing Khan Telecom!</p>
                                <p class="slip-credits">D & D By Muhammad Irfan</p>
                            </div>
                        </div>
                    `;

                    waTextRaw = `⚡ *KHAN TELECOM* ⚡\n_HIGH-SPEED BROADBAND PROVIDER_\n----------------------------------\n*RECEIPT NO:* ${inv.invoice_number}\n*DATE:* ${inv.paid_at || 'Just Now'}\n*SUBSCRIBER ID:* ${cust.customer_code}\n*NAME:* ${cust.full_name}\n*PHONE:* ${cust.phone_number}\n*AREA:* ${cust.area_sector}\n----------------------------------\n*PACKAGE:* ${pkg.package_name}\n*BILLING MONTH:* ${inv.billing_month}\n*AMOUNT DUE:* PKR ${parseFloat(inv.amount_due).toFixed(2)}\n*AMOUNT PAID:* PKR ${parseFloat(inv.amount_paid).toFixed(2)}\n*PAYMENT METHOD:* ${inv.payment_method.toUpperCase().replace('_', ' ')}\n*STATUS:* PAID ✅\n----------------------------------\n*COLLECTOR:* ${inv.collector_name || activeUser}\n==================================\nThank you for choosing Khan Telecom!\n*D & D By Muhammad Irfan*`;
                }

                const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waTextRaw)}`;

                res.end(JSON.stringify({ success: true, data: { thermal_html: thermalHtml, whatsapp_link: waLink } }));
            } else if (action === 'kt_get_employee_matrix') {
                res.end(JSON.stringify({ success: true, data: { matrix } }));
            } else if (action === 'kt_save_employee_permission') {
                const targetUserId = parseInt(data.target_user_id);
                const staff = matrix.find(m => m.user_id === targetUserId);
                if (staff) {
                    staff.permissions.role_level = data.role_level;
                    staff.permissions.can_view_financials = data.can_view_financials == 1 ? 1 : 0;
                    staff.permissions.can_manage_customers = data.can_manage_customers == 1 ? 1 : 0;
                    staff.permissions.can_create_invoice = data.can_create_invoice == 1 ? 1 : 0;
                    staff.permissions.can_collect_payment = data.can_collect_payment == 1 ? 1 : 0;
                    staff.permissions.approval_status = data.approval_status;

                    activityLogs.unshift({
                        id: activityLogs.length + 1,
                        user_id: activeUserId,
                        user_name: activeUser,
                        role_level: activeRole,
                        action_type: 'staff_approval_update',
                        description: `Updated access permissions for staff account: ${staff.display_name} (Role: ${data.role_level.toUpperCase()}, Status: ${data.approval_status.toUpperCase()}).`,
                        created_at: new Date().toLocaleString()
                    });
                }
                res.end(JSON.stringify({ success: true, data: { message: 'Staff permissions & approval status updated successfully!' } }));
            } else if (action === 'kt_get_products') {
                res.end(JSON.stringify({ success: true, data: { products, can_edit: true } }));
            } else if (action === 'kt_save_product') {
                const id = parseInt(data.id) || 0;
                const cost = parseFloat(data.cost_price) || 0;
                const sale = parseFloat(data.sale_price) || 0;
                const margin = Math.max(0, sale - cost);

                if (id > 0) {
                    const prod = products.find(p => p.id === id);
                    if (prod) {
                        prod.product_name = data.product_name;
                        prod.category = data.category;
                        prod.unit = data.unit;
                        prod.cost_price = cost;
                        prod.sale_price = sale;
                        prod.stock_qty = parseInt(data.stock_qty);
                        prod.margin = margin;
                    }
                    activityLogs.unshift({ id: activityLogs.length + 1, user_id: activeUserId, user_name: activeUser, role_level: activeRole, action_type: 'product_update', description: 'Updated inventory stock entry: ' + data.product_name, created_at: new Date().toLocaleString() });
                } else {
                    products.unshift({
                        id: products.length + 1,
                        product_name: data.product_name,
                        category: data.category || 'Hardware',
                        cost_price: cost,
                        sale_price: sale,
                        margin: margin,
                        stock_qty: parseInt(data.stock_qty) || 10,
                        unit: data.unit || 'pcs'
                    });
                    activityLogs.unshift({ id: activityLogs.length + 1, user_id: activeUserId, user_name: activeUser, role_level: activeRole, action_type: 'product_buy', description: 'Purchased new stock entry: ' + data.product_name + ' (Qty: ' + data.stock_qty + ')', created_at: new Date().toLocaleString() });
                }
                res.end(JSON.stringify({ success: true, data: { message: 'Stock entry saved successfully!' } }));
            } else if (action === 'kt_sell_product') {
                const prodId = parseInt(data.product_id);
                const custId = parseInt(data.customer_id);
                const qty = parseInt(data.quantity) || 1;

                const prod = products.find(p => p.id === prodId) || products[0];
                const cust = customers.find(c => c.id === custId) || customers[0];

                if (prod && prod.stock_qty >= qty) {
                    prod.stock_qty -= qty;
                }
                const totalSale = (prod ? prod.sale_price : 0) * qty;
                const profitMargin = Math.max(0, (prod ? prod.sale_price - prod.cost_price : 0) * qty);

                const newSale = {
                    id: productSales.length + 1,
                    product_id: prodId,
                    customer_id: custId,
                    product_name: prod ? prod.product_name : 'Hardware',
                    customer_name: cust ? cust.full_name : 'Subscriber',
                    quantity: qty,
                    total_sale: totalSale,
                    profit: profitMargin,
                    sold_by: activeUser,
                    date: new Date().toLocaleString()
                };
                productSales.unshift(newSale);

                activityLogs.unshift({ id: activityLogs.length + 1, user_id: activeUserId, user_name: activeUser, role_level: activeRole, action_type: 'product_sale', description: 'Sold ' + qty + ' ' + (prod ? prod.unit : 'pcs') + ' of ' + (prod ? prod.product_name : 'Hardware') + ' to ' + (cust ? cust.full_name : 'Subscriber') + ' for PKR ' + totalSale.toFixed(2), created_at: new Date().toLocaleString() });

                res.end(JSON.stringify({ success: true, data: { message: 'Hardware sale completed successfully!', sale_id: newSale.id, total_sale: totalSale.toFixed(2) } }));
            } else if (action === 'kt_delete_customer') {
                const id = parseInt(data.customer_id);
                const idx = customers.findIndex(c => c.id === id);
                if (idx !== -1) {
                    const deletedName = customers[idx].full_name;
                    customers.splice(idx, 1);
                    activityLogs.unshift({ id: activityLogs.length + 1, user_id: activeUserId, user_name: activeUser, role_level: activeRole, action_type: 'subscriber_delete', description: 'Deleted subscriber account: ' + deletedName, created_at: new Date().toLocaleString() });
                    res.end(JSON.stringify({ success: true, data: { message: 'Subscriber account deleted successfully!' } }));
                } else {
                    res.end(JSON.stringify({ success: false, data: { message: 'Subscriber not found.' } }));
                }
            } else if (action === 'kt_delete_invoice') {
                const id = parseInt(data.invoice_id);
                const idx = invoices.findIndex(i => i.id === id);
                if (idx !== -1) {
                    const invNo = invoices[idx].invoice_number;
                    invoices.splice(idx, 1);
                    activityLogs.unshift({ id: activityLogs.length + 1, user_id: activeUserId, user_name: activeUser, role_level: activeRole, action_type: 'invoice_delete', description: 'Deleted invoice: ' + invNo, created_at: new Date().toLocaleString() });
                    res.end(JSON.stringify({ success: true, data: { message: 'Invoice deleted successfully!' } }));
                } else {
                    res.end(JSON.stringify({ success: false, data: { message: 'Invoice not found.' } }));
                }
            } else if (action === 'kt_toggle_invoice_status') {
                const id = parseInt(data.invoice_id);
                const targetStatus = data.status || 'paid';
                const inv = invoices.find(i => i.id === id);
                if (inv) {
                    inv.payment_status = targetStatus;
                    if (targetStatus === 'paid') {
                        inv.amount_paid = inv.amount_due;
                        inv.paid_at = new Date().toLocaleString();
                        inv.collector_name = activeUser;
                    } else {
                        inv.amount_paid = 0.00;
                        inv.paid_at = null;
                    }
                    activityLogs.unshift({ id: activityLogs.length + 1, user_id: activeUserId, user_name: activeUser, role_level: activeRole, action_type: 'invoice_status_update', description: 'Updated invoice ' + inv.invoice_number + ' payment status to [' + targetStatus.toUpperCase() + ']', created_at: new Date().toLocaleString() });
                    res.end(JSON.stringify({ success: true, data: { message: 'Invoice status changed to ' + targetStatus.toUpperCase() + '!' } }));
                } else {
                    res.end(JSON.stringify({ success: false, data: { message: 'Invoice not found.' } }));
                }
            } else if (action === 'kt_delete_product') {
                const id = parseInt(data.product_id);
                const idx = products.findIndex(p => p.id === id);
                if (idx !== -1) {
                    const prodName = products[idx].product_name;
                    products.splice(idx, 1);
                    activityLogs.unshift({ id: activityLogs.length + 1, user_id: activeUserId, user_name: activeUser, role_level: activeRole, action_type: 'product_delete', description: 'Deleted hardware inventory item: ' + prodName, created_at: new Date().toLocaleString() });
                    res.end(JSON.stringify({ success: true, data: { message: 'Hardware product deleted successfully!' } }));
                } else {
                    res.end(JSON.stringify({ success: false, data: { message: 'Product not found.' } }));
                }
            } else {
                res.end(JSON.stringify({ success: false, data: { message: 'Unknown endpoint' } }));
            }
        });
        return;
    }

    // Static File Serving
    let filePath = path.join(__dirname, url === '/' || url === '/khan-telecom-portal' ? 'index.html' : url);
    const ext = path.extname(filePath);
    const contentTypeMap = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg'
    };

    const contentType = contentTypeMap[ext] || 'text/plain';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('File Not Found');
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`Khan Telecom Web Server running live at http://localhost:${PORT}`);
});
