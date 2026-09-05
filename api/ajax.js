const querystring = require('querystring');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../data.json');

const DEFAULT_PACKAGES = [
    { id: 1, package_name: "10 Mbps Fiber Basic", speed_mbps: 10, cost_price: 600, sale_price: 1200, margin: 600, status: "active" },
    { id: 2, package_name: "20 Mbps Fiber Pro", speed_mbps: 20, cost_price: 1000, sale_price: 2000, margin: 1000, status: "active" },
    { id: 3, package_name: "50 Mbps Fiber Ultra", speed_mbps: 50, cost_price: 1800, sale_price: 3500, margin: 1700, status: "active" },
    { id: 4, package_name: "100 Mbps Enterprise Fiber", speed_mbps: 100, cost_price: 3000, sale_price: 6000, margin: 3000, status: "active" }
];

// In-Memory & Persistent Database Store
let activityLogs = [];
let packages = [...DEFAULT_PACKAGES];
let products = [];
let customers = [];
let invoices = [];

let matrix = [
    { 
        user_id: 1, 
        user_login: 'saif', 
        user_pass: 'admin123', 
        display_name: 'Saif Telecom', 
        user_email: 'saif@khantelecom.com', 
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

let productSales = [];

const TMP_DATA_FILE = '/tmp/data.json';

function loadData() {
    try {
        let fileToRead = null;
        if (fs.existsSync(TMP_DATA_FILE)) {
            fileToRead = TMP_DATA_FILE;
        } else if (fs.existsSync(DATA_FILE)) {
            fileToRead = DATA_FILE;
        }
        if (fileToRead) {
            const raw = fs.readFileSync(fileToRead, 'utf8');
            const store = JSON.parse(raw);
            if (Array.isArray(store.packages) && store.packages.length > 0) packages = store.packages;
            if (Array.isArray(store.customers)) customers = store.customers;
            if (Array.isArray(store.invoices)) invoices = store.invoices;
            if (Array.isArray(store.products)) products = store.products;
            if (Array.isArray(store.activityLogs)) activityLogs = store.activityLogs;
            if (Array.isArray(store.matrix) && store.matrix.length > 0) matrix = store.matrix;
            if (Array.isArray(store.productSales)) productSales = store.productSales;
        }
    } catch (e) {
        console.error("Error loading persisted data:", e);
    }
}

function saveData() {
    const store = {
        packages,
        customers,
        invoices,
        products,
        activityLogs,
        matrix,
        productSales
    };
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf8');
    } catch (e) {
        try {
            fs.writeFileSync(TMP_DATA_FILE, JSON.stringify(store, null, 2), 'utf8');
        } catch (err) {
            console.error("Error saving data to /tmp:", err);
        }
    }
}

// Initial data load
loadData();

// Helper to auto update expired customers (30-day package cycle)
function processAutoExpiry() {
    const now = Date.now();
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

    customers.forEach(c => {
        const actTime = c.activated_at ? new Date(c.activated_at).getTime() : now;
        const elapsed = now - actTime;

        if (c.status === 'active' && elapsed >= THIRTY_DAYS_MS) {
            c.status = 'expired';
            activityLogs.unshift({
                id: activityLogs.length + 1,
                user_id: 1,
                user_name: 'System Auto-Engine',
                role_level: 'system',
                action_type: 'package_auto_expired',
                description: `Subscriber ${c.full_name} (${c.customer_code}) 30-day package cycle expired. Status set to EXPIRED.`,
                created_at: new Date().toLocaleString()
            });
        }
    });
}

function processRequest(data, res) {
    processAutoExpiry();

    const action = data.action;
    res.setHeader('Content-Type', 'application/json');

    const activeUser = data.current_user_name || 'Saif Telecom';
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
                action_type: 'staff_login',
                description: `Staff member ${staff.display_name} logged into portal.`,
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
    } else if (action === 'kt_get_customers') {
        const now = Date.now();
        const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

        const customerList = customers.map(c => {
            const pkg = packages.find(p => p.id === parseInt(c.package_id));
            const actTime = c.activated_at ? new Date(c.activated_at).getTime() : now;
            const elapsed = now - actTime;
            const remainingMs = Math.max(0, THIRTY_DAYS_MS - elapsed);
            const daysRemaining = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
            const expiryDate = new Date(actTime + THIRTY_DAYS_MS).toISOString().split('T')[0];

            return {
                ...c,
                package_name: pkg ? pkg.package_name : (c.package_name || 'N/A'),
                package_price: pkg ? pkg.sale_price : 0,
                days_remaining: daysRemaining,
                expiry_date: expiryDate
            };
        });
        res.end(JSON.stringify({ success: true, data: customerList }));
    } else if (action === 'kt_save_customer') {
        const rawId = (data.id !== undefined && data.id !== '0' && data.id !== 0 && data.id !== '') ? data.id : data.customer_id;
        const id = parseInt(rawId) || 0;
        const customCode = (data.customer_code || '').trim();
        const pkgId = parseInt(data.package_id) || 0;
        const pkg = packages.find(p => p.id === pkgId);

        if (id > 0) {
            const existing = customers.find(c => c.id === id);
            if (existing) {
                existing.customer_code = customCode || existing.customer_code;
                existing.full_name = data.full_name || existing.full_name;
                existing.phone_number = data.phone_number || existing.phone_number;
                existing.cnic_id = data.cnic_id || existing.cnic_id;
                existing.area_sector = data.area_sector || existing.area_sector;
                existing.address = data.address || existing.address;
                existing.package_id = pkgId || existing.package_id;
                existing.package_name = pkg ? pkg.package_name : existing.package_name;
                existing.assigned_ip_ipoe = data.assigned_ip_ipoe || existing.assigned_ip_ipoe;
                existing.status = data.status || existing.status;
                if (data.status === 'active' && existing.status !== 'active') {
                    existing.activated_at = new Date().toISOString();
                }

                activityLogs.unshift({ id: activityLogs.length + 1, user_id: activeUserId, user_name: activeUser, role_level: activeRole, action_type: 'customer_update', description: `Updated subscriber profile for ${existing.full_name} (${existing.customer_code})`, created_at: new Date().toLocaleString() });
                saveData();
                res.end(JSON.stringify({ success: true, data: { message: 'Subscriber updated successfully & active in ERP!' } }));
            } else {
                res.end(JSON.stringify({ success: false, data: { message: 'Subscriber not found.' } }));
            }
        } else {
            const autoNextId = customers.length ? Math.max(...customers.map(c => c.id)) + 1001 : 1001;
            const finalCode = customCode ? customCode : 'KT-' + autoNextId;

            const newCust = {
                id: customers.length ? Math.max(...customers.map(c => c.id)) + 1 : 1,
                customer_code: finalCode,
                full_name: data.full_name,
                phone_number: data.phone_number,
                cnic_id: data.cnic_id || '',
                area_sector: data.area_sector,
                address: data.address || '',
                package_id: pkgId,
                package_name: pkg ? pkg.package_name : 'Custom Package',
                assigned_ip_ipoe: data.assigned_ip_ipoe || '',
                connection_type: data.connection_type || 'Fiber_FTTH',
                billing_cycle_day: parseInt(data.billing_cycle_day) || 1,
                status: data.status || 'active',
                activated_at: new Date().toISOString()
            };
            customers.push(newCust);
            activityLogs.unshift({ id: activityLogs.length + 1, user_id: activeUserId, user_name: activeUser, role_level: activeRole, action_type: 'customer_create', description: `Registered new subscriber: ${newCust.full_name} (${newCust.customer_code})`, created_at: new Date().toLocaleString() });
            saveData();
            res.end(JSON.stringify({ success: true, data: { message: `Subscriber ${newCust.full_name} registered successfully & activated in ERP!` } }));
        }
    } else if (action === 'kt_delete_customer') {
        const rawId = (data.id !== undefined && data.id !== '0' && data.id !== 0 && data.id !== '') ? data.id : data.customer_id;
        const id = parseInt(rawId) || 0;
        const idx = customers.findIndex(c => c.id === id);
        if (idx !== -1) {
            const deletedName = customers[idx].full_name;
            const deletedCode = customers[idx].customer_code;
            customers.splice(idx, 1);

            activityLogs.unshift({ id: activityLogs.length + 1, user_id: activeUserId, user_name: activeUser, role_level: activeRole, action_type: 'customer_delete', description: `Deleted subscriber: ${deletedName} (${deletedCode})`, created_at: new Date().toLocaleString() });
            saveData();
            res.end(JSON.stringify({ success: true, data: { message: `Subscriber ${deletedName} deleted successfully from ERP.` } }));
        } else {
            res.end(JSON.stringify({ success: false, data: { message: 'Subscriber not found.' } }));
        }
    } else if (action === 'kt_get_packages') {
        const canEdit = activeRole === 'super_admin' || activeRole === 'admin';
        res.end(JSON.stringify({
            success: true,
            data: {
                packages: packages,
                can_edit: canEdit
            }
        }));
    } else if (action === 'kt_save_package') {
        const rawId = (data.id !== undefined && data.id !== '0' && data.id !== 0 && data.id !== '') ? data.id : data.package_id;
        const id = parseInt(rawId) || 0;
        const costPrice = parseFloat(data.cost_price) || 0;
        const salePrice = parseFloat(data.sale_price) || 0;
        const margin = Math.max(0, salePrice - costPrice);
        const speedMbps = parseInt(data.speed_mbps) || 10;
        const packageName = (data.package_name || '').trim();

        if (!packageName) {
            res.end(JSON.stringify({ success: false, data: { message: 'Package name is required.' } }));
            return;
        }

        if (id > 0) {
            const pkg = packages.find(p => p.id === id);
            if (pkg) {
                pkg.package_name = packageName;
                pkg.speed_mbps = speedMbps;
                pkg.cost_price = costPrice;
                pkg.sale_price = salePrice;
                pkg.margin = margin;
                pkg.status = data.status || pkg.status || 'active';
                activityLogs.unshift({ id: activityLogs.length + 1, user_id: activeUserId, user_name: activeUser, role_level: activeRole, action_type: 'package_update', description: `Updated broadband package: ${pkg.package_name} (${pkg.speed_mbps} Mbps)`, created_at: new Date().toLocaleString() });
                saveData();
                res.end(JSON.stringify({ success: true, data: { message: `Package "${pkg.package_name}" updated successfully!` } }));
            } else {
                res.end(JSON.stringify({ success: false, data: { message: 'Package not found.' } }));
            }
        } else {
            const nextId = packages.length ? Math.max(...packages.map(p => p.id)) + 1 : 1;
            const newPkg = {
                id: nextId,
                package_name: packageName,
                speed_mbps: speedMbps,
                cost_price: costPrice,
                sale_price: salePrice,
                margin: margin,
                status: data.status || 'active'
            };
            packages.push(newPkg);
            activityLogs.unshift({ id: activityLogs.length + 1, user_id: activeUserId, user_name: activeUser, role_level: activeRole, action_type: 'package_create', description: `Created new broadband package: ${newPkg.package_name} (${newPkg.speed_mbps} Mbps)`, created_at: new Date().toLocaleString() });
            saveData();
            res.end(JSON.stringify({ success: true, data: { message: `New package "${newPkg.package_name}" added successfully & active!` } }));
        }
    } else if (action === 'kt_delete_package') {
        const rawId = (data.id !== undefined && data.id !== '0' && data.id !== 0 && data.id !== '') ? data.id : data.package_id;
        const id = parseInt(rawId) || 0;
        const idx = packages.findIndex(p => p.id === id);
        if (idx !== -1) {
            const pkgName = packages[idx].package_name;
            packages.splice(idx, 1);
            activityLogs.unshift({ id: activityLogs.length + 1, user_id: activeUserId, user_name: activeUser, role_level: activeRole, action_type: 'package_delete', description: `Deleted broadband package: ${pkgName}`, created_at: new Date().toLocaleString() });
            saveData();
            res.end(JSON.stringify({ success: true, data: { message: `Package "${pkgName}" deleted successfully.` } }));
        } else {
            res.end(JSON.stringify({ success: false, data: { message: 'Package not found.' } }));
        }
    } else if (action === 'kt_get_invoices') {
        const filterStatus = data.payment_status;
        const filterDate = data.filter_date;

        let filtered = invoices;
        if (filterStatus && filterStatus !== 'all') {
            filtered = filtered.filter(i => i.payment_status === filterStatus);
        }
        if (filterDate) {
            filtered = filtered.filter(i => {
                const invCreated = i.created_at || i.paid_at || '';
                return invCreated.includes(filterDate) || i.billing_month.includes(filterDate);
            });
        }

        res.end(JSON.stringify({ success: true, data: filtered }));
    } else if (action === 'kt_create_invoice') {
        const custId = parseInt(data.customer_id);
        const cust = customers.find(c => c.id === custId);
        const pkg = packages.find(p => p.id === cust.package_id);
        const amount = pkg ? pkg.sale_price : 1500.00;

        const nextInvId = invoices.length + 1;
        const newInv = {
            id: nextInvId,
            invoice_number: `INV-${data.billing_month.replace('-', '')}-${strPad(nextInvId, 4)}`,
            customer_id: custId,
            full_name: cust ? cust.full_name : 'Unknown',
            customer_code: cust ? cust.customer_code : 'KT-1001',
            phone_number: cust ? cust.phone_number : '',
            area_sector: cust ? cust.area_sector : '',
            billing_month: data.billing_month,
            amount_due: amount,
            amount_paid: 0.00,
            discount: 0.00,
            payment_status: 'unpaid',
            payment_method: 'cash',
            collector_name: null,
            paid_at: null,
            created_at: new Date().toISOString()
        };
        invoices.push(newInv);
        activityLogs.unshift({ id: activityLogs.length + 1, user_id: activeUserId, user_name: activeUser, role_level: activeRole, action_type: 'invoice_generate', description: `Generated invoice ${newInv.invoice_number} for ${newInv.full_name}`, created_at: new Date().toLocaleString() });
        saveData();
        res.end(JSON.stringify({ success: true, data: { message: `Invoice ${newInv.invoice_number} generated successfully!` } }));
    } else if (action === 'kt_collect_payment') {
        const invId = parseInt(data.invoice_id);
        const inv = invoices.find(i => i.id === invId);
        if (inv) {
            const paid = parseFloat(data.amount_paid);
            inv.amount_paid += paid;
            inv.payment_method = data.payment_method;
            inv.collector_name = activeUser;
            inv.paid_at = new Date().toLocaleString();

            if (inv.amount_paid >= inv.amount_due) {
                inv.payment_status = 'paid';
            } else if (inv.amount_paid > 0) {
                inv.payment_status = 'partial';
            }

            const cust = customers.find(c => c.id === inv.customer_id);
            if (cust) {
                cust.status = 'active';
                cust.activated_at = new Date().toISOString();
            }

            activityLogs.unshift({ id: activityLogs.length + 1, user_id: activeUserId, user_name: activeUser, role_level: activeRole, action_type: 'payment_collect', description: `Collected PKR ${paid} for invoice ${inv.invoice_number}. Status: ${inv.payment_status.toUpperCase()}`, created_at: new Date().toLocaleString() });
            saveData();
            res.end(JSON.stringify({ success: true, data: { message: `Payment of PKR ${paid} recorded successfully for ${inv.invoice_number}!`, invoice_id: inv.id } }));
        } else {
            res.end(JSON.stringify({ success: false, data: { message: 'Invoice not found.' } }));
        }
    } else if (action === 'kt_get_products') {
        res.end(JSON.stringify({ success: true, data: { products: products } }));
    } else if (action === 'kt_save_product') {
        const id = parseInt(data.product_id) || 0;
        const costPrice = parseFloat(data.cost_price) || 0;
        const salePrice = parseFloat(data.sale_price) || 0;
        const margin = salePrice - costPrice;
        const stockQty = parseInt(data.stock_qty) || 0;

        if (id > 0) {
            const prod = products.find(p => p.id === id);
            if (prod) {
                prod.product_name = data.product_name;
                prod.category = data.category || 'Hardware';
                prod.cost_price = costPrice;
                prod.sale_price = salePrice;
                prod.margin = margin;
                prod.stock_qty = stockQty;
                prod.unit = data.unit || 'pcs';

                activityLogs.unshift({ id: activityLogs.length + 1, user_id: activeUserId, user_name: activeUser, role_level: activeRole, action_type: 'product_update', description: `Updated inventory product: ${prod.product_name} (Stock: ${prod.stock_qty})`, created_at: new Date().toLocaleString() });
                saveData();
                res.end(JSON.stringify({ success: true, data: { message: 'Hardware product updated successfully!' } }));
            }
        } else {
            const newProd = {
                id: products.length + 1,
                product_name: data.product_name,
                category: data.category || 'Hardware',
                cost_price: costPrice,
                sale_price: salePrice,
                margin: margin,
                stock_qty: stockQty,
                unit: data.unit || 'pcs'
            };
            products.push(newProd);
            activityLogs.unshift({ id: activityLogs.length + 1, user_id: activeUserId, user_name: activeUser, role_level: activeRole, action_type: 'product_create', description: `Added new hardware product to inventory: ${newProd.product_name}`, created_at: new Date().toLocaleString() });
            saveData();
            res.end(JSON.stringify({ success: true, data: { message: 'New hardware product added successfully!' } }));
        }
    } else if (action === 'kt_sell_product') {
        const prodId = parseInt(data.product_id);
        const custId = parseInt(data.customer_id);
        const qty = parseInt(data.quantity) || 1;

        const prod = products.find(p => p.id === prodId);
        const cust = customers.find(c => c.id === custId);

        if (!prod || !cust) {
            res.end(JSON.stringify({ success: false, data: { message: 'Invalid product or subscriber selected.' } }));
            return;
        }

        if (prod.stock_qty < qty) {
            res.end(JSON.stringify({ success: false, data: { message: `Insufficient stock! Only ${prod.stock_qty} ${prod.unit} available in inventory.` } }));
            return;
        }

        prod.stock_qty -= qty;

        const totalSale = prod.sale_price * qty;
        const profit = prod.margin * qty;
        const newSale = {
            id: productSales.length + 1,
            product_name: prod.product_name,
            customer_name: cust.full_name,
            customer_code: cust.customer_code,
            quantity: qty,
            total_sale: totalSale,
            profit: profit,
            sold_by: activeUser,
            date: new Date().toLocaleString()
        };
        productSales.push(newSale);

        activityLogs.unshift({ id: activityLogs.length + 1, user_id: activeUserId, user_name: activeUser, role_level: activeRole, action_type: 'hardware_sale', description: `Sold ${qty}x ${prod.product_name} to ${cust.full_name} (${cust.customer_code}) for PKR ${totalSale}`, created_at: new Date().toLocaleString() });
        saveData();

        res.end(JSON.stringify({
            success: true,
            data: {
                message: `Hardware sale recorded successfully! Sold ${qty}x ${prod.product_name} to ${cust.full_name}.`,
                sale_id: newSale.id
            }
        }));
    } else if (action === 'kt_get_product_sales') {
        res.end(JSON.stringify({ success: true, data: productSales }));
    } else if (action === 'kt_get_audit_logs') {
        res.end(JSON.stringify({ success: true, data: activityLogs }));
    } else if (action === 'kt_register_staff_request') {
        const name = (data.full_name || '').trim();
        const login = (data.user_login || '').trim().toLowerCase();
        const pass = data.user_pass || '';
        const role = data.role_level || 'employee';

        if (!name || !login || !pass) {
            res.end(JSON.stringify({ success: false, data: { message: 'Please fill in all required registration fields.' } }));
            return;
        }

        const existing = matrix.find(m => m.user_login === login);
        if (existing) {
            res.end(JSON.stringify({ success: false, data: { message: 'Username already taken! Please choose a different login username.' } }));
            return;
        }

        const newStaff = {
            user_id: matrix.length + 1,
            user_login: login,
            user_pass: pass,
            display_name: name,
            user_email: `${login}@khantelecom.com`,
            permissions: {
                role_level: role,
                can_view_financials: role === 'admin' ? 1 : 0,
                can_create_invoice: 1,
                can_collect_payment: 1,
                can_edit_packages: role === 'admin' ? 1 : 0,
                can_manage_customers: 1,
                can_export_reports: role === 'admin' ? 1 : 0,
                approval_status: 'pending_approval'
            }
        };
        matrix.push(newStaff);

        activityLogs.unshift({ id: activityLogs.length + 1, user_id: newStaff.user_id, user_name: newStaff.display_name, role_level: role, action_type: 'staff_registration_request', description: `New staff account registration requested by ${name} (${role.toUpperCase()}). Status: PENDING APPROVAL.`, created_at: new Date().toLocaleString() });
        saveData();

        res.end(JSON.stringify({ success: true, data: { message: 'Registration request submitted! Please ask Super Admin to approve your account access.' } }));
    } else if (action === 'kt_approve_staff_request') {
        const staffId = parseInt(data.staff_user_id);
        const staff = matrix.find(m => m.user_id === staffId);
        if (staff) {
            staff.permissions.approval_status = 'approved';
            activityLogs.unshift({ id: activityLogs.length + 1, user_id: activeUserId, user_name: activeUser, role_level: activeRole, action_type: 'staff_approval', description: `Super Admin approved access for staff account: ${staff.display_name}`, created_at: new Date().toLocaleString() });
            saveData();
            res.end(JSON.stringify({ success: true, data: { message: `Account access for ${staff.display_name} has been APPROVED!` } }));
        } else {
            res.end(JSON.stringify({ success: false, data: { message: 'Staff member not found.' } }));
        }
    } else if (action === 'kt_revoke_staff_access') {
        const staffId = parseInt(data.staff_user_id);
        const staff = matrix.find(m => m.user_id === staffId);
        if (staff) {
            staff.permissions.approval_status = 'revoked';
            activityLogs.unshift({ id: activityLogs.length + 1, user_id: activeUserId, user_name: activeUser, role_level: activeRole, action_type: 'staff_revoked', description: `Super Admin revoked access for staff account: ${staff.display_name}`, created_at: new Date().toLocaleString() });
            saveData();
            res.end(JSON.stringify({ success: true, data: { message: `Access revoked for ${staff.display_name}.` } }));
        } else {
            res.end(JSON.stringify({ success: false, data: { message: 'Staff member not found.' } }));
        }
    } else if (action === 'kt_get_receipt_data') {
        const isHardware = data.is_hardware === '1' || data.is_hardware === 'true';
        let htmlContent = '';
        let waTextRaw = '';
        let cleanPhone = '';

        if (isHardware) {
            const saleId = parseInt(data.sale_id);
            const sale = productSales.find(s => s.id === saleId);
            if (!sale) {
                res.end(JSON.stringify({ success: false, data: { message: 'Product sale record not found.' } }));
                return;
            }

            const cust = customers.find(c => c.customer_code === sale.customer_code || c.full_name === sale.customer_name) || {
                full_name: sale.customer_name,
                customer_code: sale.customer_code || 'KT-CUST',
                phone_number: '03000000000',
                area_sector: 'General'
            };
            const prod = products.find(p => p.product_name === sale.product_name);
            const saleNo = 'SALE-' + strPad(sale.id, 4);
            const unitPrice = prod ? prod.sale_price : (sale.total_sale / max(1, sale.quantity));

            cleanPhone = (cust.phone_number || '').replace(/^0/, '92');

            htmlContent = `
                <div class="kt-thermal-slip">
                    <div class="slip-header">
                        <img src="/assets/img/logo.png" style="width:48px; height:48px; object-fit:contain; margin-bottom:4px;">
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
                        <p class="slip-credits">Developed by Muhammad Irfan</p>
                    </div>
                </div>
            `;

            waTextRaw = `⚡ *KHAN TELECOM* ⚡\n_HARDWARE & EQUIPMENT RECEIPT_\n----------------------------------\n*RECEIPT NO:* ${saleNo}\n*DATE:* ${sale.date}\n*SUBSCRIBER ID:* ${cust.customer_code}\n*NAME:* ${cust.full_name}\n*PHONE:* ${cust.phone_number}\n*AREA:* ${cust.area_sector}\n----------------------------------\n*ITEM:* ${sale.product_name}\n*QUANTITY:* ${sale.quantity} ${prod ? prod.unit : 'pcs'}\n*UNIT PRICE:* PKR ${parseFloat(unitPrice).toFixed(2)}\n*TOTAL PAID:* PKR ${parseFloat(sale.total_sale).toFixed(2)}\n*PAYMENT METHOD:* CASH SETTLEMENT\n*STATUS:* PAID ✅\n----------------------------------\n*SOLD BY:* ${sale.sold_by || activeUser}\n==================================\nThank you for choosing Khan Telecom!\n*Developed by Muhammad Irfan*`;
        } else {
            const invId = parseInt(data.invoice_id);
            const inv = invoices.find(i => i.id === invId);
            if (!inv) {
                res.end(JSON.stringify({ success: false, data: { message: 'Invoice record not found.' } }));
                return;
            }

            const cust = customers.find(c => c.id === inv.customer_id) || {
                full_name: inv.full_name,
                customer_code: inv.customer_code,
                phone_number: inv.phone_number,
                area_sector: inv.area_sector
            };
            const pkg = packages.find(p => p.id === cust.package_id) || { package_name: 'Fiber Internet' };

            cleanPhone = (cust.phone_number || '').replace(/^0/, '92');

            htmlContent = `
                <div class="kt-thermal-slip">
                    <div class="slip-header">
                        <img src="/assets/img/logo.png" style="width:48px; height:48px; object-fit:contain; margin-bottom:4px;">
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
                        <p class="slip-credits">Developed by Muhammad Irfan</p>
                    </div>
                </div>
            `;

            waTextRaw = `⚡ *KHAN TELECOM* ⚡\n_HIGH-SPEED BROADBAND PROVIDER_\n----------------------------------\n*RECEIPT NO:* ${inv.invoice_number}\n*DATE:* ${inv.paid_at || 'Just Now'}\n*SUBSCRIBER ID:* ${cust.customer_code}\n*NAME:* ${cust.full_name}\n*PHONE:* ${cust.phone_number}\n*AREA:* ${cust.area_sector}\n----------------------------------\n*PACKAGE:* ${pkg.package_name}\n*BILLING MONTH:* ${inv.billing_month}\n*AMOUNT DUE:* PKR ${parseFloat(inv.amount_due).toFixed(2)}\n*AMOUNT PAID:* PKR ${parseFloat(inv.amount_paid).toFixed(2)}\n*PAYMENT METHOD:* ${inv.payment_method.toUpperCase().replace('_', ' ')}\n*STATUS:* PAID ✅\n----------------------------------\n*COLLECTOR:* ${inv.collector_name || activeUser}\n==================================\nThank you for choosing Khan Telecom!\n*Developed by Muhammad Irfan*`;
        }

        const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waTextRaw)}`;

        res.end(JSON.stringify({
            success: true,
            data: {
                html: htmlContent,
                whatsapp_url: waLink,
                whatsapp_text: waTextRaw
            }
        }));
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
            saveData();
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
            saveData();
            res.end(JSON.stringify({ success: true, data: { message: 'Hardware product deleted successfully!' } }));
        } else {
            res.end(JSON.stringify({ success: false, data: { message: 'Product not found.' } }));
        }
    } else {
        res.end(JSON.stringify({ success: false, data: { message: 'Unknown endpoint' } }));
    }
}

function strPad(n, width) {
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join('0') + n;
}

module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        if (res.status) {
            res.status(200).end();
        } else {
            res.writeHead(200);
            res.end();
        }
        return;
    }

    if (req.method === 'POST') {
        let postData = null;

        if (req.body) {
            if (typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
                postData = req.body;
            } else if (typeof req.body === 'string') {
                postData = querystring.parse(req.body);
            } else if (Buffer.isBuffer(req.body)) {
                postData = querystring.parse(req.body.toString('utf8'));
            }
        }

        if (postData && Object.keys(postData).length > 0) {
            processRequest(postData, res);
            return;
        }

        let body = '';
        let processed = false;

        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            if (!processed) {
                processed = true;
                let parsed = {};
                try {
                    parsed = body ? querystring.parse(body) : {};
                } catch(e) {}
                processRequest(parsed, res);
            }
        });

        if (req.readableEnded || req.complete) {
            setTimeout(() => {
                if (!processed) {
                    processed = true;
                    processRequest(postData || {}, res);
                }
            }, 50);
        }
    } else {
        if (res.setHeader) res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end('<h1>Khan Telecom API Active</h1>');
    }
};
