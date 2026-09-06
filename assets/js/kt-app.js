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

        /* ==================== LOCAL STORAGE HELPERS ==================== */
        getStoredCustomers: function() {
            var raw = localStorage.getItem('kt_storage_customers');
            if (raw !== null) {
                try { return JSON.parse(raw); } catch(e) { return []; }
            }
            if (localStorage.getItem('kt_is_reset') === 'true') {
                return [];
            }
            return [
                { id: 68982, customer_code: 'k026-hamza', full_name: 'hamza', phone_number: '03118870806', cnic_id: '3740585654350', email: 'k026ha3ab3@site.com', area_sector: 'Rawalpindi', address: 'mohallah dhoke mustaqeem Peshawar Road RWP', package_id: 1, package_name: 'Premier-2', password: '5050', nas: 'K030-BRAS2', conn_status: 'Online', status: 'active', monthly_due: 1275, expiry_date: '05 Oct 2026 11:59:00', created_at: '2026-05-23 00:10' },
                { id: 68983, customer_code: 'k026-aamir', full_name: 'aamir', phone_number: '03115529699', cnic_id: '3740232775185', email: 'k026aa6ab3@site.com', area_sector: 'Rawalpindi', address: 'RWP', package_id: 2, package_name: 'Premier-5', password: '5050', nas: 'BL006', conn_status: 'Online', status: 'active', monthly_due: 750, expiry_date: '01 Aug 2026 11:59:00', created_at: '2026-05-23 00:10' },
                { id: 68984, customer_code: 'k026-aamir1', full_name: 'aqib javed', phone_number: '03341623260', cnic_id: '14202-3245598', email: 'k026aa1628@site.com', area_sector: 'Rawalpindi', address: 'House no. CB 1148 Qadria colony street no.3 Rawalpindi', package_id: 3, package_name: 'Premier-7', password: '1234', nas: 'BL006', conn_status: 'Online', status: 'active', monthly_due: 1185, expiry_date: '07 Sep 2026 11:59:00', created_at: '2026-05-23 00:10' },
                { id: 68985, customer_code: 'k026-aamirf', full_name: 'aamirf', phone_number: '03129670174', cnic_id: '37405-9385501', email: 'k026aa6ab3@site.com', area_sector: 'Rawalpindi', address: 'Qureshi Street Near Khalifa_e_rashdin Mosque Rawalpindi', package_id: 3, package_name: 'Premier-7', password: '1234', nas: 'BL006', conn_status: 'Offline', status: 'active', monthly_due: 1500, expiry_date: '25 Sep 2026 11:59:00', created_at: '2026-05-23 00:10' },
                { id: 68986, customer_code: 'k026-abid', full_name: 'abid', phone_number: '03115543204', cnic_id: '37405-4685524', email: 'k026ab6ab3@site.com', area_sector: 'Rawalpindi', address: 'Qadria colony main street Rawalpindi', package_id: 2, package_name: 'Premier-5', password: '1234', nas: 'BL006', conn_status: 'Online', status: 'active', monthly_due: 0, expiry_date: '19 Sep 2026 11:59:00', created_at: '2026-05-23 00:10' },
                { id: 68987, customer_code: 'k026-abdullah1', full_name: 'abdullah1', phone_number: '03115578274', cnic_id: '3520297059595', email: 'k026abccc1@site.com', area_sector: 'Rawalpindi', address: 'Qadria colony st no 1 Abdullah house Peshawar road pit wadh mar', package_id: 3, package_name: 'Premier-7', password: '1234', nas: 'K030-BRAS2', conn_status: 'Online', status: 'active', monthly_due: 1185, expiry_date: '16 Sep 2026 11:59:00', created_at: '2026-05-23 00:10' },
                { id: 68988, customer_code: 'k026-abdullah', full_name: 'abdullah', phone_number: '03005400584', cnic_id: '37405-4685424', email: 'k026ab6ab3@site.com', area_sector: 'Rawalpindi', address: 'House #75A/1 qadria colony dhoke mustaqeem peshawar road Rawalpi', package_id: 3, package_name: 'Premier-7', password: '1234', nas: 'BL006', conn_status: 'Online', status: 'active', monthly_due: 900, expiry_date: '09 Sep 2026 11:59:00', created_at: '2026-05-23 00:10' },
                { id: 68989, customer_code: 'k026-abid', full_name: 'abid khattak', phone_number: '03365522218', cnic_id: '374055928865', email: 'k026ab6ab3@site.com', area_sector: 'Rawalpindi', address: 'House no 314 Dhoke Mustaqeem Peshawar Road Rwp', package_id: 2, package_name: 'Premier-5', password: '1234', nas: 'K030-BRAS2', conn_status: 'Online', status: 'active', monthly_due: 1125, expiry_date: '15 Sep 2026 11:59:00', created_at: '2026-05-23 00:10' },
                { id: 68990, customer_code: 'k026-abid', full_name: 'Abid Khattak', phone_number: '03142202528', cnic_id: '4220133957475', email: 'k026ad64c9@site.com', area_sector: 'Rawalpindi', address: 'dm-3- Dhoke Mustaqeem Peshawar Road Rwp', package_id: 2, package_name: 'Premier-5', password: '1234', nas: 'K030-BRAS2', conn_status: 'Online', status: 'active', monthly_due: 1350, expiry_date: '28 Sep 2026 11:59:00', created_at: '2026-05-23 00:10' },
                { id: 68991, customer_code: 'k026-adesign', full_name: 'adesign', phone_number: '03360074443', cnic_id: '3740502798857', email: 'k026ad61f5@site.com', area_sector: 'Rawalpindi', address: 'H.No. 208 Gulshan Naveed Colony Dhoke Mustaqeem', package_id: 4, package_name: 'Premier-15', password: '123456', nas: 'K030-BRAS2', conn_status: 'Online', status: 'active', monthly_due: 1500, expiry_date: '05 Sep 2026 11:59:00', created_at: '2026-05-23 00:10' },
                { id: 68992, customer_code: 'k026-afaq', full_name: 'Muhammad Afaq', phone_number: '03175582962', cnic_id: '3730219637831', email: 'k026af6ab3@site.com', area_sector: 'Rawalpindi', address: 'House no i-d31, street no 1, mohallah faizalabad peshawar road Raw', package_id: 2, package_name: 'Premier-5', password: '1234', nas: 'BL006', conn_status: 'Offline', status: 'expired', monthly_due: 0, expiry_date: '26 Apr 2025 23:59:59', created_at: '2026-05-23 00:10' },
                { id: 68993, customer_code: 'k026-ahmed', full_name: 'adeel jamil', phone_number: '0343556120', cnic_id: '3720239159919', email: 'k026ahc71f@site.com', area_sector: 'Rawalpindi', address: 'DM-2 House no 447/5D, Street no 2, mugal street, dhok mustaqeem', package_id: 2, package_name: 'Premier-5', password: '1234', nas: 'K030-BRAS2', conn_status: 'Online', status: 'active', monthly_due: 1125, expiry_date: '10 Sep 2026 11:59:00', created_at: '2026-05-23 00:10' },
                { id: 68994, customer_code: 'k026-ahsan', full_name: 'ahsan', phone_number: '03075678874', cnic_id: '3720118675647', email: 'k026ah6ab3@site.com', area_sector: 'Rawalpindi', address: 'Snr-abd-Kh.No.1130 NR Grave Yard Dh.Mustaqeem RWP', package_id: 3, package_name: 'Premier-7', password: '1234', nas: 'BL006', conn_status: 'Online', status: 'active', monthly_due: 1185, expiry_date: '04 Sep 2026 11:59:00', created_at: '2026-05-23 00:10' },
                { id: 68995, customer_code: 'k026-ajmal', full_name: 'ajmal', phone_number: '03335562344', cnic_id: '3740514088023', email: 'k026aj8629@site.com', area_sector: 'Rawalpindi', address: 'House no 750, street no 5, Qadria Colony Rawalpindi', package_id: 3, package_name: 'Premier-7', password: '12345', nas: 'K030-BRAS2', conn_status: 'Online', status: 'active', monthly_due: 1500, expiry_date: '12 Sep 2026 11:59:00', created_at: '2026-05-23 00:10' },
                { id: 68996, customer_code: 'k026-akash', full_name: 'Akashman', phone_number: '03125071244', cnic_id: '3740575571018', email: 'k026ak6ab3@site.com', area_sector: 'Rawalpindi', address: 'HR266/7,st#03 fazal abad peshawar road RWP', package_id: 3, package_name: 'Premier-7', password: '5555', nas: 'K030-BRAS2', conn_status: 'Online', status: 'active', monthly_due: 1500, expiry_date: '04 Oct 2026 11:59:00', created_at: '2026-05-23 00:10' },
                { id: 68997, customer_code: 'k026-akbi', full_name: 'akbarhussain', phone_number: '03435146966', cnic_id: '1560703560013', email: 'k026ak66d69@site.com', area_sector: 'Nowshera', address: 'NOWSHERA', package_id: 5, package_name: 'Premier-10', password: '1234', nas: 'BL006', conn_status: 'Offline', status: 'expired', monthly_due: 0, expiry_date: '26 Aug 2024 23:59:00', created_at: '2026-05-23 00:10' },
                { id: 68998, customer_code: 'k026-aqib', full_name: 'Sardar Aqib Khalil', phone_number: '03455896481', cnic_id: '13501-4354374', email: 'k026aq7378@site.com', area_sector: 'Peshawar', address: 'House no 685, shah waliullah street west, mehria colony peshawar', package_id: 2, package_name: 'Premier-5', password: '1234', nas: 'K030-BRAS2', conn_status: 'Online', status: 'active', monthly_due: 1125, expiry_date: '19 Sep 2026 11:59:00', created_at: '2026-05-23 00:10' },
                { id: 68999, customer_code: 'k026-ali', full_name: 'ali', phone_number: '03312922922', cnic_id: '3740574735829', email: 'k026alaf99@site.com', area_sector: 'Rawalpindi', address: 'House no 473,Street no 1,Qadria Colony,Dhok mustaqeem,Peshawar road', package_id: 4, package_name: 'Premier-15', password: '1234', nas: 'BL006', conn_status: 'Online', status: 'active', monthly_due: 0, expiry_date: '20 Sep 2026 11:59:00', created_at: '2026-05-23 00:10' },
                { id: 69000, customer_code: 'k026-alihassan', full_name: 'alihassan', phone_number: '03180549119', cnic_id: '420520571301', email: 'k026al6ab3@site.com', area_sector: 'Sector Q-5', address: 'Q-5', package_id: 3, package_name: 'Premier-7', password: '1234', nas: 'BL006', conn_status: 'Offline', status: 'expired', monthly_due: 0, expiry_date: '14 May 2025 23:59:59', created_at: '2026-05-23 00:10' },
                { id: 69001, customer_code: 'k026-amir', full_name: 'amir hussain', phone_number: '03328224017', cnic_id: '37201-4319013', email: 'k026am6ab3@site.com', area_sector: 'Piriwadhai', address: 'piriwadhai mor qadria colony street no 3 house no 1174', package_id: 1, package_name: 'Premier-2', password: '1234', nas: 'K030-BRAS2', conn_status: 'Online', status: 'active', monthly_due: 1200, expiry_date: '03 Sep 2026 11:59:00', created_at: '2026-05-23 00:10' },
                { id: 69002, customer_code: 'k026-amirrn', full_name: 'amirrn', phone_number: '03005527546', cnic_id: '3740558660511', email: 'k026amdaf9@site.com', area_sector: 'IQAR-ST', address: 'IQAR-ST', package_id: 4, package_name: 'Premier-15', password: '1234', nas: 'BL006', conn_status: 'Offline', status: 'expired', monthly_due: 0, expiry_date: '07 Mar 2026 23:59:00', created_at: '2026-05-23 00:10' },
                { id: 69003, customer_code: 'k026-Amjad', full_name: 'Amjad Mahmood', phone_number: '03005440302', cnic_id: '3740572736021', email: 'k026am6ab3@site.com', area_sector: 'Rawalpindi', address: 'House no 366, street no 3, muhallah fazalabad peshawar road Rawal', package_id: 2, package_name: 'Premier-5', password: '1234', nas: 'K030-BRAS2', conn_status: 'Online', status: 'active', monthly_due: 1125, expiry_date: '07 Sep 2026 11:59:00', created_at: '2026-05-23 00:10' },
                { id: 69004, customer_code: 'k026-aneel', full_name: 'aneel', phone_number: '03115578274', cnic_id: '3520297059595', email: 'k026an6ab3@site.com', area_sector: 'Rawalpindi', address: 'Qadria colony st no 1 Abdullah house Peshawar road pit wadh mar', package_id: 3, package_name: 'Premier-7', password: '1234', nas: 'BL006', conn_status: 'Offline', status: 'expired', monthly_due: 0, expiry_date: '28 Jun 2025 23:59:59', created_at: '2026-05-23 00:10' },
                { id: 69005, customer_code: 'k026-Anil', full_name: 'anil Firdous johan', phone_number: '03350404355', cnic_id: '37405595354', email: 'k026an7378@site.com', area_sector: 'Sector Q-2', address: 'Q-2', package_id: 2, package_name: 'Premier-5', password: '1234', nas: 'K030-BRAS2', conn_status: 'Online', status: 'active', monthly_due: 1500, expiry_date: '20 Sep 2026 11:59:00', created_at: '2026-05-23 00:10' },
                { id: 69006, customer_code: 'k026-aqib', full_name: 'Saghir Ahmad', phone_number: '03005540375', cnic_id: '8230348275731', email: 'k026aq6ab3@site.com', area_sector: 'Rawalpindi', address: 'House no 399 street no 2 mugal street dhok mustaqeem road Rawal', package_id: 3, package_name: 'Premier-7', password: '1234', nas: 'K030-BRAS2', conn_status: 'Online', status: 'active', monthly_due: 1500, expiry_date: '09 Sep 2026 11:59:00', created_at: '2026-05-23 00:10' },
                { id: 69007, customer_code: 'k026-arehman', full_name: 'arehman', phone_number: '03325506867', cnic_id: '3740597957335', email: 'k026ar7378@site.com', area_sector: 'DM-3', address: 'DM-3', package_id: 3, package_name: 'Premier-7', password: '1234', nas: 'K030-BRAS2', conn_status: 'Online', status: 'active', monthly_due: 1185, expiry_date: '07 Sep 2026 11:59:00', created_at: '2026-05-23 00:10' },
                { id: 69008, customer_code: 'k026-Arif', full_name: 'Arif amin', phone_number: '03465154499', cnic_id: '3740445389359', email: 'k026ar722@site.com', area_sector: 'Rawalpindi', address: 'Dhok mustaqeem street b4 peshawar road rawalpindi', package_id: 3, package_name: 'Premier-7', password: '1234', nas: 'K030-BRAS2', conn_status: 'Online', status: 'active', monthly_due: 1185, expiry_date: '12 Sep 2026 11:59:00', created_at: '2026-05-23 00:10' },
                { id: 69009, customer_code: 'k026-arshad', full_name: 'arshad-Muhammad Sohaib Malik', phone_number: '03125397196', cnic_id: '37405 0605009', email: 'k026ar6ab3@site.com', area_sector: 'Rawalpindi', address: 'EIC-315 Dhok Mustaqeem Road Peshawar Road Rawalpindi', package_id: 6, package_name: 'Premier-20', password: '1234', nas: 'BL006', conn_status: 'Offline', status: 'expired', monthly_due: 0, expiry_date: '10 Nov 2025 23:59:00', created_at: '2026-05-23 00:10' },
                { id: 69010, customer_code: 'k026-arslan', full_name: 'arslan', phone_number: '03135861972', cnic_id: '3740591749927', email: 'k026ar6ab3@site.com', area_sector: 'Milat Chowk', address: 'arslan sohail HOUSE # CB1928/9 STREET NO. B-1 Milat Chowk dhok M', package_id: 4, package_name: 'Premier-15', password: '123456', nas: 'K030-BRAS2', conn_status: 'Online', status: 'active', monthly_due: 2000, expiry_date: '05 Sep 2026 11:59:00', created_at: '2026-05-23 00:10' },
                { id: 69011, customer_code: 'k026-arslanali', full_name: 'arslanali', phone_number: '03185286032', cnic_id: '3740558827487', email: 'k026ar66d69@site.com', area_sector: 'Farooqabad', address: 'Farooqabad Dhok mustaqeem near masjid khalifa-e-rashideen', package_id: 2, package_name: 'Premier-5', password: '1234', nas: 'K030-BRAS2', conn_status: 'Online', status: 'active', monthly_due: 1125, expiry_date: '09 Sep 2026 11:59:00', created_at: '2026-05-23 00:10' },
                { id: 69012, customer_code: 'k026-asad4', full_name: 'asad4', phone_number: '03100860579', cnic_id: '374058827487', email: 'k026as6ab3@site.com', area_sector: 'MOBLINE-4', address: 'MOBLINE-4', package_id: 4, package_name: 'Premier-15', password: '1122', nas: 'BL006', conn_status: 'Online', status: 'active', monthly_due: 1500, expiry_date: '12 Sep 2026 11:59:00', created_at: '2026-05-23 00:10' },
                { id: 69013, customer_code: 'k026-asad', full_name: 'asad', phone_number: '03145478227', cnic_id: '6110161717675', email: 'k026as6ab3@site.com', area_sector: 'Farooqabad', address: 'FAROOQABAD Asad ptl', package_id: 3, package_name: 'Premier-7', password: '1122', nas: 'BL006', conn_status: 'Offline', status: 'active', monthly_due: 0, expiry_date: '15 Sep 2026 11:59:00', created_at: '2026-05-23 00:10' },
                { id: 69014, customer_code: 'k026-a-office', full_name: 'Muhammad asif', phone_number: '03203171063', cnic_id: '38201-9287551', email: 'k026as6ab3@site.com', area_sector: 'Gulshan-e-Naveed', address: 'KH361, Mohamdi masjid street, Gulshan-e-Naveed colony, Dhok must', package_id: 4, package_name: 'Premier-15', password: '1234', nas: 'K030-BRAS2', conn_status: 'Online', status: 'active', monthly_due: 2000, expiry_date: '02 Oct 2026 11:59:00', created_at: '2026-05-23 00:10' },
                { id: 69015, customer_code: 'k026-asif12', full_name: 'Asif1', phone_number: '1457902215', cnic_id: '331051109479', email: 'k026as3dc2@site.com', area_sector: 'Rawalpindi', address: 'street no 02, Fazalabad, House no 437, peshawar road rwp', package_id: 2, package_name: 'Premier-5', password: '123456', nas: 'K030-BRAS2', conn_status: 'Online', status: 'active', monthly_due: 1125, expiry_date: '04 Sep 2026 11:59:00', created_at: '2026-05-23 00:10' },
                { id: 69016, customer_code: 'k026-asim', full_name: 'asim malik', phone_number: '03465100581', cnic_id: '3610484101031', email: 'k026as50d7@site.com', area_sector: 'Rawalpindi', address: 'malik chal Dhoke Mustaqeem, rawalpindi', package_id: 2, package_name: 'Premier-5', password: '1234', nas: 'K030-BRAS2', conn_status: 'Online', status: 'active', monthly_due: 1500, expiry_date: '18 Sep 2026 11:59:00', created_at: '2026-05-23 00:10' },
                { id: 69017, customer_code: 'k026-asimf2', full_name: 'asimf2', phone_number: '034350404191', cnic_id: '3740543674055', email: 'k026as8186@site.com', area_sector: 'Rawalpindi', address: 'House no 283 Address fazalabad Street on 2 main peshawar road r', package_id: 1, package_name: 'Premier-2', password: '1234', nas: 'K030-BRAS2', conn_status: 'Online', status: 'active', monthly_due: 900, expiry_date: '11 Sep 2026 11:59:00', created_at: '2026-05-23 00:10' },
                { id: 69018, customer_code: 'k026-bukhari', full_name: 'bukhari', phone_number: '03008500609', cnic_id: '6110177516999', email: 'k026bu1788@site.com', area_sector: 'Rawalpindi Cantt', address: 'House no 1 st no 2 mehria colony peshawar road rawalpindi cantt', package_id: 2, package_name: 'Premier-5', password: '5050', nas: 'BL006', conn_status: 'Offline', status: 'expired', monthly_due: 0, expiry_date: '05 Nov 2023 23:59:59', created_at: '2026-05-23 00:10' },
                { id: 69019, customer_code: 'k026-javed', full_name: 'javed', phone_number: '03365522218', cnic_id: '374055928865', email: 'k026ja0570@site.com', area_sector: 'M-MAN', address: 'M-MAN', package_id: 3, package_name: 'Premier-7', password: '1234', nas: 'BL006', conn_status: 'Online', status: 'active', monthly_due: 1580, expiry_date: '10 Sep 2026 11:59:00', created_at: '2026-05-23 00:10' },
                { id: 69020, customer_code: 'k026-sadam', full_name: 'sadamkhan', phone_number: '03365518818', cnic_id: '374055928865', email: 'k026sa5efd@site.com', area_sector: 'M-1', address: 'M-1', package_id: 2, package_name: 'Premier-5', password: '1234', nas: 'K030-BRAS2', conn_status: 'Online', status: 'active', monthly_due: 1220, expiry_date: '07 Sep 2026 11:59:00', created_at: '2026-05-23 00:10' },
                { id: 69021, customer_code: 'k026-sajjadh', full_name: 'sajjadh', phone_number: '03465357919', cnic_id: '3410423184933', email: 'k026sa6ab3@site.com', area_sector: 'Gunaveed', address: 'Gunaveed', package_id: 2, package_name: 'Premier-5', password: '1234', nas: 'K030-BRAS2', conn_status: 'Online', status: 'active', monthly_due: 1500, expiry_date: '07 Sep 2026 11:59:00', created_at: '2026-05-23 00:10' },
                { id: 69022, customer_code: 'k026-sajjad12', full_name: 'sajjad12', phone_number: '03070053403', cnic_id: '374055928865', email: 'k026sa6ab3@site.com', area_sector: 'I-2', address: 'I-2', package_id: 3, package_name: 'Premier-7', password: '1234', nas: 'BL006', conn_status: 'Offline', status: 'active', monthly_due: 0, expiry_date: '01 Jun 2026 23:59:59', created_at: '2026-05-23 00:10' },
                { id: 69023, customer_code: 'k026-ayaz', full_name: 'ayaz', phone_number: '03015045993', cnic_id: '3740582548875', email: 'k026ayefbf@site.com', area_sector: 'Rawalpindi', address: 'Old house no 458/9a, new house no CB-1177, street no 3, Qadria C', package_id: 2, package_name: 'Premier-5', password: '1234', nas: 'K030-BRAS2', conn_status: 'Online', status: 'active', monthly_due: 1500, expiry_date: '30 Sep 2026 11:59:00', created_at: '2026-05-23 00:10' },
                { id: 69024, customer_code: 'k026-bilal3', full_name: 'bilal3', phone_number: '03435408033', cnic_id: '4240190961644', email: 'k026bi6ab3@site.com', area_sector: 'M| Nasrullah', address: 'M| Nasrullah Cable ka gar', package_id: 2, package_name: 'Premier-5', password: '1234', nas: 'BL006', conn_status: 'Online', status: 'active', monthly_due: 1125, expiry_date: '15 Sep 2026 11:59:00', created_at: '2026-05-23 00:10' },
                { id: 69025, customer_code: 'k026-basit', full_name: 'basit', phone_number: '03450481132', cnic_id: '3820127668727', email: 'k026ba7f9e@site.com', area_sector: 'Sector F-3', address: 'F-3', package_id: 4, package_name: 'Premier-15', password: '1234', nas: 'BL006', conn_status: 'Offline', status: 'expired', monthly_due: 0, expiry_date: '06 Jun 2025 23:59:59', created_at: '2026-05-23 00:10' },
                { id: 69026, customer_code: 'k026-da', full_name: 'Daniyal Ahmed', phone_number: '03130808032', cnic_id: '13101-9138684', email: 'k026da6ab3@site.com', area_sector: 'Rawalpindi', address: 'Rh no. 1324 Farooqabad sihala Rwp', package_id: 6, package_name: 'Premier-20', password: '1234', nas: 'BL006', conn_status: 'Offline', status: 'expired', monthly_due: 0, expiry_date: '06 Jan 2025 23:59:59', created_at: '2026-05-23 00:10' },
                { id: 69027, customer_code: 'k026-ehtasham', full_name: 'ehtasham', phone_number: '03445060193', cnic_id: '3740503681025', email: 'k026eh7471@site.com', area_sector: 'Rawalpindi', address: 'Zain ul abdin, house no 437/Nk, street no 3, Qadria Colony Rawal', package_id: 2, package_name: 'Premier-5', password: '1234', nas: 'K030-BRAS2', conn_status: 'Online', status: 'active', monthly_due: 1145, expiry_date: '12 Sep 2026 11:59:00', created_at: '2026-05-23 00:10' },
                { id: 69028, customer_code: 'k026-faisalf', full_name: 'shah faisal', phone_number: '03145090316', cnic_id: '1730107308125', email: 'k026fa622d@site.com', area_sector: 'Af mug', address: 'Af mug', package_id: 2, package_name: 'Premier-5', password: '1234', nas: 'K030-BRAS2', conn_status: 'Online', status: 'active', monthly_due: 1125, expiry_date: '17 Sep 2026 11:59:00', created_at: '2026-05-23 00:10' }
            ];
        },
        setStoredCustomers: function(data) {
            try { localStorage.setItem('kt_storage_customers', JSON.stringify(data)); } catch(e) {}
        },

        getStoredPackages: function() {
            var raw = localStorage.getItem('kt_storage_packages');
            if (raw !== null) {
                try { return JSON.parse(raw); } catch(e) { return []; }
            }
            if (localStorage.getItem('kt_is_reset') === 'true') {
                return [];
            }
            return [
                { id: 1, package_name: '10 Mbps Fiber Basic', speed_mbps: 10, cost_price: 600, sale_price: 1200, margin: 600, status: 'active' },
                { id: 2, package_name: '20 Mbps Fiber Pro', speed_mbps: 20, cost_price: 1000, sale_price: 2000, margin: 1000, status: 'active' },
                { id: 3, package_name: '50 Mbps Fiber Ultra', speed_mbps: 50, cost_price: 1800, sale_price: 3500, margin: 1700, status: 'active' },
                { id: 4, package_name: '100 Mbps Enterprise Fiber', speed_mbps: 100, cost_price: 3000, sale_price: 6000, margin: 3000, status: 'active' }
            ];
        },
        setStoredPackages: function(data) {
            try { localStorage.setItem('kt_storage_packages', JSON.stringify(data)); } catch(e) {}
        },

        getStoredProducts: function() {
            var raw = localStorage.getItem('kt_storage_products');
            if (raw !== null) {
                try { return JSON.parse(raw); } catch(e) { return []; }
            }
            if (localStorage.getItem('kt_is_reset') === 'true') {
                return [];
            }
            return [
                { id: 1, product_name: 'TP-Link Dual Band Gigabit Router C6', category: 'Routers', unit: 'pcs', cost_price: 4500, sale_price: 6500, margin: 2000, stock_qty: 15 },
                { id: 2, product_name: 'GPON ONU Fiber Optical Node Modem', category: 'ONU / Fiber', unit: 'pcs', cost_price: 2200, sale_price: 3500, margin: 1300, stock_qty: 30 },
                { id: 3, product_name: 'Single Mode 2-Core Outdoor Drop Cable (Roll)', category: 'Fiber Cable', unit: 'roll', cost_price: 8000, sale_price: 12000, margin: 4000, stock_qty: 8 }
            ];
        },
        setStoredProducts: function(data) {
            try { localStorage.setItem('kt_storage_products', JSON.stringify(data)); } catch(e) {}
        },

        getStoredInvoices: function() {
            var raw = localStorage.getItem('kt_storage_invoices');
            if (raw !== null) {
                try { return JSON.parse(raw); } catch(e) { return []; }
            }
            if (localStorage.getItem('kt_is_reset') === 'true') {
                return [];
            }
            return [
                { id: 1, invoice_number: 'INV-2026-001', customer_id: 1, customer_code: 'KT-1001', full_name: 'Muhammad Ali', phone_number: '03001234567', area_sector: 'Sector F-11', billing_month: 'September 2026', amount_due: 1200, amount_paid: 1200, discount: 0, payment_status: 'paid', payment_method: 'cash', collector_name: 'Saif Telecom', paid_at: new Date().toLocaleString() }
            ];
        },
        setStoredInvoices: function(data) {
            try { localStorage.setItem('kt_storage_invoices', JSON.stringify(data)); } catch(e) {}
        },

        getStoredStaff: function() {
            var raw = localStorage.getItem('kt_storage_staff');
            if (raw !== null) {
                try { return JSON.parse(raw); } catch(e) { return []; }
            }
            return [
                { user_id: 1, user_login: 'saif', display_name: 'Saif Telecom', user_email: 'saif@khantelecom.com', permissions: { role_level: 'super_admin', can_view_financials: 1, can_create_invoice: 1, can_collect_payment: 1, can_edit_packages: 1, can_manage_customers: 1, can_export_reports: 1, approval_status: 'approved' } }
            ];
        },
        setStoredStaff: function(data) {
            try { localStorage.setItem('kt_storage_staff', JSON.stringify(data)); } catch(e) {}
        },

        getStoredLogs: function() {
            var raw = localStorage.getItem('kt_storage_logs');
            if (raw !== null) {
                try { return JSON.parse(raw); } catch(e) { return []; }
            }
            if (localStorage.getItem('kt_is_reset') === 'true') {
                return [];
            }
            return [
                { id: 1, user_id: 1, user_name: 'Saif Telecom', role_level: 'super_admin', action_type: 'system_init', description: 'Khan Telecom ERP Engine initialized successfully.', created_at: new Date().toLocaleString() }
            ];
        },
        setStoredLogs: function(data) {
            try { localStorage.setItem('kt_storage_logs', JSON.stringify(data)); } catch(e) {}
        },
        setStoredLogs: function(data) {
            try { localStorage.setItem('kt_storage_logs', JSON.stringify(data)); } catch(e) {}
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
                    var waTextRaw = '📦 *KHAN TELECOM HARDWARE EQUIPMENT RECEIPT* 📦\n----------------------------------\n*SUBSCRIBER:* ' + cust.full_name + ' (' + cust.customer_code + ')\n*ITEM BOUGHT:* ' + prod.product_name + '\n*QUANTITY:* ' + qty + ' ' + (prod.unit || 'pcs') + '\n*UNIT RETAIL PRICE:* PKR ' + parseFloat(prod.sale_price).toFixed(2) + '\n----------------------------------\n*TOTAL BILL:* PKR ' + totalBill + ' ✅\n==================================\nThank you for choosing Khan Telecom!';
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
                var formDataRaw = $(this).serializeArray();
                var formData = {};
                formDataRaw.forEach(function(item) { formData[item.name] = item.value; });

                var custs = self.getStoredCustomers();
                var custId = parseInt(formData.customer_id);
                var cust = custs.find(function(c) { return parseInt(c.id) === custId; }) || { full_name: 'Subscriber', customer_code: 'KT-1001', area_sector: 'Sector F-11', phone_number: '03001234567' };

                var invs = self.getStoredInvoices();
                var newInvId = invs.length > 0 ? Math.max.apply(null, invs.map(function(i){return parseInt(i.id);})) + 1 : 1;
                var amountDue = parseFloat(formData.amount_due) || 1200;
                var amountPaid = parseFloat(formData.amount_paid) || 0;
                var status = amountPaid >= amountDue ? 'paid' : 'unpaid';

                var newInv = {
                    id: newInvId,
                    invoice_number: 'INV-2026-' + (100 + newInvId),
                    customer_id: custId,
                    customer_code: cust.customer_code,
                    full_name: cust.full_name,
                    phone_number: cust.phone_number,
                    area_sector: cust.area_sector,
                    billing_month: formData.billing_month || 'September 2026',
                    amount_due: amountDue,
                    amount_paid: amountPaid,
                    discount: parseFloat(formData.discount) || 0,
                    payment_status: status,
                    payment_method: formData.payment_method || 'cash',
                    collector_name: user.display_name,
                    paid_at: status === 'paid' ? new Date().toLocaleString() : ''
                };

                invs.push(newInv);
                self.setStoredInvoices(invs);
                self.renderInvoicesTable(invs);
                self.showToast('Invoice generated successfully!', 'success');
                $('#kt-invoice-modal, #kt-modal-backdrop').hide();

                var postData = $(this).serialize() + '&action=kt_create_invoice&nonce=' + ktConfig.nonce + '&current_user_id=' + user.user_id + '&current_user_name=' + encodeURIComponent(user.display_name) + '&current_user_role=' + user.role_level;
                $.post(ktConfig.ajaxUrl, postData, function(res) {
                    self.fetchInvoices();
                    self.fetchDashboardStats(true);
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
                var formDataRaw = $(this).serializeArray();
                var formData = {};
                formDataRaw.forEach(function(item) { formData[item.name] = item.value; });

                var invId = parseInt(formData.invoice_id);
                var amountPaid = parseFloat(formData.amount_paid) || 0;

                var invs = self.getStoredInvoices();
                var inv = invs.find(function(i) { return parseInt(i.id) === invId; });
                if (inv) {
                    inv.amount_paid = (parseFloat(inv.amount_paid || 0) + amountPaid);
                    if (inv.amount_paid >= inv.amount_due) {
                        inv.payment_status = 'paid';
                    }
                    inv.paid_at = new Date().toLocaleString();
                    inv.payment_method = formData.payment_method || 'cash';
                    inv.collector_name = user.display_name;
                    self.setStoredInvoices(invs);
                    self.renderInvoicesTable(invs);
                }

                self.showToast('Payment collected & slip ready!', 'success');
                $('#kt-payment-modal, #kt-modal-backdrop').hide();
                if (invId) {
                    self.openReceiptModal(invId, 'invoice');
                }

                var postData = $(this).serialize() + '&action=kt_collect_payment&nonce=' + ktConfig.nonce + '&collector_id=' + user.user_id + '&collector_name=' + encodeURIComponent(user.display_name) + '&collector_role=' + user.role_level;
                $.post(ktConfig.ajaxUrl, postData, function(res) {
                    self.fetchInvoices();
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

            // --- SUBSCRIBERS DIRECTORY REAL-TIME FILTER HANDLERS ---
            $(document).on('click', '.btn-status-pill', function(e) {
                e.preventDefault();
                var status = $(this).attr('data-status');
                status = (status !== undefined && status !== null) ? String(status) : '';

                $('.btn-status-pill').removeClass('active btn-primary btn-success btn-outline-danger').addClass('btn-secondary');
                
                if (status === 'active') {
                    $(this).removeClass('btn-secondary').addClass('btn-success active');
                } else if (status === 'inactive') {
                    $(this).removeClass('btn-secondary').addClass('btn-outline-danger active');
                } else {
                    $(this).removeClass('btn-secondary').addClass('btn-primary active');
                }

                $('#cust-status-filter').val(status);
                self.fetchCustomers();
            });

            $(document).on('keyup input paste search', '#cust-search-input', function() {
                self.fetchCustomers();
            });

            $(document).on('change', '#cust-status-filter', function() {
                var status = $(this).val();
                $('.btn-status-pill').removeClass('active btn-primary btn-success btn-outline-danger').addClass('btn-secondary');
                
                if (status === 'active') {
                    $('.btn-status-pill[data-status="active"]').removeClass('btn-secondary').addClass('btn-success active');
                } else if (status === 'inactive') {
                    $('.btn-status-pill[data-status="inactive"]').removeClass('btn-secondary').addClass('btn-outline-danger active');
                } else {
                    $('.btn-status-pill[data-status=""]').removeClass('btn-secondary').addClass('btn-primary active');
                }

                self.fetchCustomers();
            });

            $(document).on('click', '#btn-filter-customers', function(e) {
                e.preventDefault();
                self.fetchCustomers();
            });

            // --- SETTINGS & MEMBER SHEET IMPORTER HANDLERS ---
            var parsedSubscribers = [];

            $(document).on('click', '#btn-browse-file, #drop-zone-container', function(e) {
                if (e.target.id === 'member-sheet-input') return;
                e.preventDefault();
                $('#member-sheet-input').val('');
                $('#member-sheet-input').click();
            });

            $(document).on('click', '#member-sheet-input', function(e) {
                e.stopPropagation();
            });

            $(document).on('change', '#member-sheet-input', function(e) {
                var file = e.target.files[0];
                if (!file) return;
                parseMemberSheetFile(file);
            });

            $(document).on('dragover', '#drop-zone-container', function(e) {
                e.preventDefault();
                $(this).css('background', 'rgba(56, 139, 253, 0.15)');
            });

            $(document).on('dragleave drop', '#drop-zone-container', function(e) {
                e.preventDefault();
                $(this).css('background', 'rgba(56, 139, 253, 0.05)');
                if (e.type === 'drop') {
                    var file = e.originalEvent.dataTransfer.files[0];
                    if (file) parseMemberSheetFile(file);
                }
            });

            $(document).on('click', '#btn-quick-upload-now', function(e) {
                e.preventDefault();
                $('#btn-confirm-bulk-import').click();
            });

            function extractSubscriberFieldsFromRow(row, rowIndex) {
                if (!row || typeof row !== 'object') return null;

                function getVal(keywords) {
                    var keys = Object.keys(row);
                    for (var k = 0; k < keys.length; k++) {
                        var keyLower = keys[k].toLowerCase().replace(/[^a-z0-9]/g, '');
                        for (var w = 0; w < keywords.length; w++) {
                            var kwLower = keywords[w].toLowerCase().replace(/[^a-z0-9]/g, '');
                            if (keyLower.includes(kwLower)) {
                                var val = String(row[keys[k]]).trim();
                                if (val && val !== 'undefined' && val !== 'null') return val;
                            }
                        }
                    }
                    return '';
                }

                var code = getVal(['accountid', 'secret', 'customercode', 'subscribercode', 'code', 'id', 'account', 'username', 'user']);
                var name = getVal(['full name', 'profilename', 'subscribername', 'subscriber', 'name', 'customer', 'client', 'member']);
                
                // Smart fallback if name keyword didn't match
                if (!name) {
                    var keys = Object.keys(row);
                    for (var i = 0; i < keys.length; i++) {
                        var strVal = String(row[keys[i]] || '').trim();
                        if (strVal && isNaN(strVal) && strVal.length >= 2 && !strVal.includes('@') && !strVal.includes('192.168.')) {
                            name = strVal;
                            break;
                        }
                    }
                }
                if (!name && code) name = 'Subscriber ' + code;
                if (!name) name = 'Subscriber #' + (rowIndex || 1);

                var phone = getVal(['phone', 'whatsapp', 'mobile', 'contact', 'cell', 'num']);
                var cnic = getVal(['cnic', 'identity', 'nic', 'cnicid', 'cnicno']);
                var pkgName = getVal(['packagetier', 'packagename', 'package', 'profile', 'tier', 'plan', 'speed']);
                var pass = getVal(['password', 'secretpass', 'pass', 'pwd']);
                var nas = getVal(['nasserver', 'nas', 'router', 'server', 'assignedip', 'ipoe', 'ip']);
                var cStat = getVal(['cstatus', 'creditstatus', 'c_status', 'billingstatus', 'paymentstatus', 'credit']);
                var rawStatus = getVal(['profilestatus', 'status', 'state', 'accstatus', 'active']);
                var monthlyDue = getVal(['monthlydue', 'monthlycharges', 'due', 'price', 'bill', 'charges', 'amount', 'fee', 'rs', 'pkr']);
                var expiry = getVal(['expirationdate', 'expiration', 'expirydate', 'expiry', 'duedate', 'validuntil', 'date']);
                var area = getVal(['areasector', 'sector', 'area', 'zone', 'city']);
                var address = getVal(['address', 'location', 'street', 'house']);

                var status = 'active';
                if (rawStatus) {
                    var lowerS = rawStatus.toLowerCase();
                    if (lowerS.includes('inact') || lowerS.includes('susp') || lowerS.includes('disab') || lowerS.includes('expir') || lowerS.includes('off') || lowerS.includes('🔴') || lowerS.includes('0') || lowerS.includes('false')) {
                        status = 'inactive';
                    }
                }

                var dueAmount = 2500;
                if (monthlyDue) {
                    var cleanNum = monthlyDue.replace(/[^0-9.]/g, '');
                    if (cleanNum) dueAmount = parseFloat(cleanNum) || 2500;
                }

                return {
                    customer_code: code || ('KT-' + (1000 + (rowIndex || 1))),
                    full_name: name,
                    phone_number: phone || '03000000000',
                    cnic_id: cnic || '',
                    package_name: pkgName || '10 Mbps Fiber Basic',
                    account_password: pass || '123456',
                    nas_server: nas || 'NAS-Lahore-01',
                    assigned_ip_ipoe: (nas && nas.match(/\d+\.\d+\.\d+\.\d+/)) ? nas : ('192.168.10.' + (100 + (rowIndex || 1))),
                    c_status: cStat || 'Paid',
                    status: status,
                    monthly_due: dueAmount,
                    expiry_date: expiry || '2026-10-06',
                    area_sector: area || 'General Sector',
                    address: address || area || 'Lahore'
                };
            }

            function parseMemberSheetFile(file) {
                if (!file) return;
                self.showToast('⏳ Reading sheet file "' + file.name + '"...', 'info');

                var isJson = file.name.toLowerCase().endsWith('.json');
                var reader = new FileReader();

                reader.onload = function(evt) {
                    var records = [];
                    try {
                        if (isJson) {
                            var content = evt.target.result;
                            var rawArr = JSON.parse(content);
                            if (Array.isArray(rawArr)) records = rawArr;
                            else if (rawArr.customers && Array.isArray(rawArr.customers)) records = rawArr.customers;
                            else if (rawArr.subscribers && Array.isArray(rawArr.subscribers)) records = rawArr.subscribers;
                        } else if (typeof XLSX !== 'undefined') {
                            var data = new Uint8Array(evt.target.result);
                            var workbook = XLSX.read(data, { type: 'array' });
                            var sheetName = workbook.SheetNames[0];
                            var rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
                            
                            rawRows.forEach(function(row, idx) {
                                var obj = extractSubscriberFieldsFromRow(row, idx + 1);
                                if (obj) {
                                    records.push(obj);
                                }
                            });
                        } else {
                            var textContent = new TextDecoder("utf-8").decode(evt.target.result);
                            var lines = textContent.split(/\r\n|\n/);
                            if (lines.length >= 2) {
                                var headers = lines[0].split(',').map(function(h) { return h.trim().replace(/^["']|["']$/g, ''); });
                                for (var i = 1; i < lines.length; i++) {
                                    var line = lines[i].trim();
                                    if (!line) continue;
                                    var cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(function(c) { return c.trim().replace(/^["']|["']$/g, ''); });
                                    var rowObj = {};
                                    headers.forEach(function(h, idx) { rowObj[h] = cols[idx] || ''; });
                                    var obj = extractSubscriberFieldsFromRow(rowObj, i);
                                    if (obj) records.push(obj);
                                }
                            }
                        }
                    } catch(err) {
                        console.error('File parse error:', err);
                        alert('Failed to parse member sheet file: ' + err.message);
                        return;
                    }

                    if (records.length === 0) {
                        alert('No valid subscriber records found in the uploaded sheet. Please ensure the sheet has subscriber data rows.');
                        return;
                    }

                    parsedSubscribers = records;
                    $('#preview-row-count').text(records.length);

                    var rowsHtml = '';
                    records.forEach(function(r) {
                        var statusBadge = (r.status === 'active') ? '<span class="badge badge-active">🟢 Active</span>' : '<span class="badge badge-suspended">🔴 Inactive</span>';
                        rowsHtml += '<tr>' +
                            '<td><strong>' + (r.customer_code || 'KT-Auto') + '</strong></td>' +
                            '<td>' + (r.full_name || 'Subscriber') + '</td>' +
                            '<td>' + (r.phone_number || 'N/A') + '</td>' +
                            '<td>' + (r.cnic_id || 'N/A') + '</td>' +
                            '<td>' + (r.package_name || '10 Mbps Basic') + '</td>' +
                            '<td><code>' + (r.account_password || r.password || '••••••') + '</code></td>' +
                            '<td>' + (r.nas_server || r.assigned_ip_ipoe || 'NAS-Lahore-01') + '</td>' +
                            '<td><span class="badge badge-info">' + (r.c_status || 'Paid') + '</span></td>' +
                            '<td>' + statusBadge + '</td>' +
                            '<td><strong>Rs ' + (r.monthly_due || 2500) + '</strong></td>' +
                            '<td>' + (r.expiry_date || '2026-10-06') + '</td>' +
                            '<td>' + (r.address || r.area_sector || 'Lahore') + '</td>' +
                        '</tr>';
                    });

                    $('#preview-table-body').html(rowsHtml);
                    $('#import-preview-section').slideDown(300);

                    // Execute instant real-time sync into ERP database
                    executeBulkSubscriberSync(records, file.name);

                    $('#file-upload-status-box').html(
                        '<div style="margin-top:16px; padding:14px 18px; background:rgba(46, 160, 67, 0.15); border:1px solid #2ea043; border-radius:10px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">' +
                            '<div>' +
                                '<strong style="color:var(--text-main); font-size:15px; display:flex; align-items:center; gap:6px;">⚡ Real-Time Synced: ' + file.name + '</strong>' +
                                '<span style="font-size:12px; color:var(--text-muted);">' + records.length + ' subscriber rows uploaded & synchronized live in ERP system database.</span>' +
                            '</div>' +
                            '<button type="button" id="btn-goto-subscribers-directory" class="btn btn-success btn-lg">👥 View Subscribers Directory (' + records.length + ' Saved)</button>' +
                        '</div>'
                    );

                    self.showToast('⚡ Real-Time Sync Active! ' + records.length + ' subscribers uploaded to ERP!', 'success');
                    
                    if ($('#import-preview-section').length) {
                        $('html, body').animate({
                            scrollTop: $('#import-preview-section').offset().top - 80
                        }, 400);
                    }
                };

                if (isJson) {
                    reader.readAsText(file);
                } else {
                    reader.readAsArrayBuffer(file);
                }
            }

            function executeBulkSubscriberSync(records, fileName) {
                if (!records || records.length === 0) return;

                var localCusts = self.getStoredCustomers();
                var localPkgs = self.getStoredPackages();
                var updatedCount = 0;
                var addedCount = 0;

                records.forEach(function(item) {
                    var code = (item.customer_code || '').trim();
                    var name = (item.full_name || '').trim();
                    if (!name) return;

                    var existing = localCusts.find(function(c) { return (code && c.customer_code === code) || (c.full_name.toLowerCase() === name.toLowerCase()); });
                    var pkg = localPkgs.find(function(p) { return p.id === parseInt(item.package_id) || p.package_name.toLowerCase().includes((item.package_name || '').toLowerCase()); });

                    if (existing) {
                        existing.full_name = name || existing.full_name;
                        existing.phone_number = item.phone_number || existing.phone_number;
                        existing.cnic_id = item.cnic_id || existing.cnic_id;
                        existing.area_sector = item.area_sector || existing.area_sector;
                        existing.address = item.address || existing.address;
                        existing.package_id = pkg ? pkg.id : existing.package_id;
                        existing.package_name = pkg ? pkg.package_name : (item.package_name || existing.package_name);
                        existing.account_password = item.account_password || item.password || existing.account_password || '123456';
                        existing.nas_server = item.nas_server || existing.nas_server || 'NAS-Lahore-01';
                        existing.assigned_ip_ipoe = item.assigned_ip_ipoe || item.nas_server || existing.assigned_ip_ipoe || '192.168.10.100';
                        existing.c_status = item.c_status || existing.c_status || 'Paid';
                        existing.status = item.status || existing.status || 'active';
                        existing.monthly_due = item.monthly_due ? parseInt(item.monthly_due) : (existing.monthly_due || 2500);
                        existing.expiry_date = item.expiry_date || existing.expiry_date || '2026-10-06';
                        updatedCount++;
                    } else {
                        var autoNextId = localCusts.length ? Math.max.apply(null, localCusts.map(function(c){return parseInt(c.id);})) + 1 : 1;
                        var autoCode = code || ('KT-' + (1000 + autoNextId));
                        localCusts.push({
                            id: autoNextId,
                            customer_code: autoCode,
                            full_name: name,
                            phone_number: item.phone_number || '03000000000',
                            cnic_id: item.cnic_id || '',
                            area_sector: item.area_sector || 'General Sector',
                            address: item.address || '',
                            package_id: pkg ? pkg.id : 1,
                            package_name: pkg ? pkg.package_name : (item.package_name || '10 Mbps Fiber Basic'),
                            account_password: item.account_password || item.password || '123456',
                            nas_server: item.nas_server || 'NAS-Lahore-01',
                            assigned_ip_ipoe: item.assigned_ip_ipoe || ('192.168.10.' + (100 + autoNextId)),
                            c_status: item.c_status || 'Paid',
                            connection_type: item.connection_type || 'Fiber_FTTH',
                            billing_cycle_day: parseInt(item.billing_cycle_day) || 1,
                            status: item.status || 'active',
                            monthly_due: item.monthly_due ? parseInt(item.monthly_due) : 2500,
                            expiry_date: item.expiry_date || '2026-10-06',
                            activated_at: new Date().toISOString(),
                            days_remaining: 30
                        });
                        addedCount++;
                    }
                });

                self.setStoredCustomers(localCusts);

                var user = self.getUserSession();
                $.post(ktConfig.ajaxUrl, {
                    action: 'kt_bulk_import_customers',
                    nonce: ktConfig.nonce,
                    subscribers: JSON.stringify(records),
                    current_user_id: user.user_id,
                    current_user_name: encodeURIComponent(user.display_name),
                    current_user_role: user.role_level
                }, function(res) {
                    if (res && res.success && res.data && res.data.customers) {
                        self.setStoredCustomers(res.data.customers);
                    }
                });
            }

            $(document).on('click', '#btn-goto-subscribers-directory', function(e) {
                e.preventDefault();
                window.location.hash = 'customers';
                self.switchView('customers');
            });

            $(document).on('click', '#btn-download-sample-csv', function(e) {
                e.preventDefault();
                var csvContent = "Subscriber Code,Full Name,Phone Number,CNIC ID,Area Sector,Full Address,Package Name,Assigned IP,Status\n" +
                    "KT-2001,Muhammad Rashid,03001112233,35202-9876543-1,Sector F-11,House 45 Street 2,20 Mbps Fiber Pro,192.168.10.101,active\n" +
                    "KT-2002,Usman Tariq,03214445566,35202-1239876-2,Sector E-7,House 12 Street 9,50 Mbps Fiber Ultra,192.168.10.102,active\n" +
                    "KT-2003,Bilal Ahmed,03337778899,35202-5554443-3,Phase 2 Sector B,House 89,10 Mbps Fiber Basic,192.168.10.103,inactive\n";
                
                var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                var link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'KhanTelecom_Subscriber_Member_Sheet_Template.csv';
                link.click();
                self.showToast('Sample CSV Member Sheet template downloaded!', 'success');
            });

            $(document).on('click', '#btn-confirm-bulk-import', function(e) {
                e.preventDefault();
                if (!parsedSubscribers || parsedSubscribers.length === 0) return;

                var $btn = $(this);
                $btn.prop('disabled', true).text('Uploading & Importing Subscribers...');

                executeBulkSubscriberSync(parsedSubscribers, 'Uploaded Sheet');

                setTimeout(function() {
                    $btn.prop('disabled', false).text('🚀 Import All Subscribers to ERP System');
                    self.showToast('🎉 ' + parsedSubscribers.length + ' subscribers imported & synchronized in ERP!', 'success');
                    window.location.hash = 'customers';
                    self.switchView('customers');
                }, 500);
            });

            $(document).on('click', '#btn-export-db-json', function(e) {
                e.preventDefault();
                var store = {
                    customers: self.getStoredCustomers(),
                    packages: self.getStoredPackages(),
                    products: self.getStoredProducts(),
                    invoices: self.getStoredInvoices(),
                    staff: self.getStoredStaff(),
                    logs: self.getStoredLogs()
                };
                var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(store, null, 2));
                var downloadAnchor = document.createElement('a');
                downloadAnchor.setAttribute("href", dataStr);
                downloadAnchor.setAttribute("download", "KhanTelecom_Full_Database_Backup_" + Date.now() + ".json");
                document.body.appendChild(downloadAnchor);
                downloadAnchor.click();
                downloadAnchor.remove();
                self.showToast('Full Database JSON exported!', 'success');
            });

            $(document).on('change', '#restore-db-json-input', function(e) {
                var file = e.target.files[0];
                if (!file) return;
                var reader = new FileReader();
                reader.onload = function(evt) {
                    try {
                        var store = JSON.parse(evt.target.result);
                        if (store.customers) self.setStoredCustomers(store.customers);
                        if (store.packages) self.setStoredPackages(store.packages);
                        if (store.products) self.setStoredProducts(store.products);
                        if (store.invoices) self.setStoredInvoices(store.invoices);
                        if (store.staff) self.setStoredStaff(store.staff);
                        if (store.logs) self.setStoredLogs(store.logs);
                        self.showToast('Database JSON restored successfully!', 'success');
                        self.switchView('dashboard');
                    } catch(err) {
                        alert('Error restoring database JSON file.');
                    }
                };
                reader.readAsText(file);
            });

            $(document).on('click', '#btn-reset-demo-data', function(e) {
                e.preventDefault();
                if (confirm('⚠️ PERMANENT WIPE WARNING: This will completely ERASE and REMOVE ALL ERP DATA (Subscribers, Invoices, Products, Packages, Activity Logs) and reset database to 0. Are you 100% sure you want to wipe all data?')) {
                    localStorage.setItem('kt_is_reset', 'true');
                    localStorage.setItem('kt_storage_customers', '[]');
                    localStorage.setItem('kt_storage_packages', '[]');
                    localStorage.setItem('kt_storage_products', '[]');
                    localStorage.setItem('kt_storage_invoices', '[]');
                    localStorage.setItem('kt_storage_logs', '[]');

                    var user = self.getUserSession();
                    $.post(ktConfig.ajaxUrl, {
                        action: 'kt_reset_database',
                        nonce: ktConfig.nonce,
                        user_id: user.user_id,
                        user_name: encodeURIComponent(user.display_name),
                        user_role: user.role_level
                    }, function(res) {
                        self.showToast('🗑️ All ERP database data wiped & cleared to 0!', 'danger');
                        self.switchView('dashboard');
                    }).fail(function() {
                        self.showToast('🗑️ Local ERP database wiped clean!', 'danger');
                        self.switchView('dashboard');
                    });
                }
            });

            $(document).on('click', '#btn-save-isp-settings', function(e) {
                e.preventDefault();
                var settingsObj = {
                    isp_name: $('#setting-isp-name').val() || 'Khan Telecom & Fiber Systems',
                    support_phone: $('#setting-support-phone').val() || '+92 300 1234567',
                    isp_address: $('#setting-isp-address').val() || 'Sector F-11, Main Fiber Hub, Lahore',
                    nas_primary_ip: $('#setting-nas-ip').val() || '192.168.10.1',
                    nas_api_port: $('#setting-nas-port').val() || '8728',
                    auto_suspend_expired: $('#setting-auto-suspend').is(':checked'),
                    auto_sms_reminders: $('#setting-auto-wa').is(':checked')
                };

                localStorage.setItem('kt_isp_settings', JSON.stringify(settingsObj));
                if (settingsObj.isp_name) {
                    $('.logo-text h2').text(settingsObj.isp_name.toUpperCase());
                }

                var user = self.getUserSession();
                $.post(ktConfig.ajaxUrl, Object.assign({
                    action: 'kt_save_isp_settings',
                    nonce: ktConfig.nonce,
                    current_user_id: user.user_id,
                    current_user_name: encodeURIComponent(user.display_name),
                    current_user_role: user.role_level
                }, settingsObj), function(res) {
                    self.showToast('⚙️ System ISP Settings saved & locked live in ERP!', 'success');
                }).fail(function() {
                    self.showToast('⚙️ System ISP Settings saved locally!', 'success');
                });
            });

            $(document).on('click', '#btn-detect-duplicates', function(e) {
                e.preventDefault();
                self.detectDuplicateSubscribers();
            });

            $(document).on('change', '#chk-select-all-duplicates', function() {
                var isChecked = $(this).is(':checked');
                $('.chk-duplicate-group').prop('checked', isChecked);
            });

            $(document).on('click', '#btn-execute-merge-duplicates', function(e) {
                e.preventDefault();
                self.executeMergeDuplicates();
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
                case 'settings':
                    this.loadSettingsView();
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
                                <th>Account ID / Secret</th>
                                <th>Profile Name</th>
                                <th>Phone / WhatsApp</th>
                                <th>CNIC / Identity</th>
                                <th>Package Tier</th>
                                <th>Password</th>
                                <th>NAS Server</th>
                                <th>C.Status</th>
                                <th>Profile Status</th>
                                <th>Monthly Due</th>
                                <th>Expiration Date</th>
                                <th>Address / Sector</th>
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

        isSubscriberActive: function(c) {
            if (!c) return false;
            var s = String(c.status || c.profile_status || '').toLowerCase().trim();
            if (s.includes('inact') || s.includes('susp') || s.includes('expir') || s.includes('disab') || s.includes('off') || s.includes('🔴') || s === '0' || s === 'false') {
                return false;
            }
            return true;
        },

        renderCustomersTable: function(custs, search, statusFilter) {
            search = (search || '').toLowerCase();
            statusFilter = (statusFilter !== undefined && statusFilter !== null) ? String(statusFilter).toLowerCase() : '';

            var self = this;
            var filtered = custs.filter(function(c) {
                var matchesSearch = !search || 
                    (c.full_name || '').toLowerCase().includes(search) || 
                    (c.customer_code || '').toLowerCase().includes(search) || 
                    (c.phone_number || '').toLowerCase().includes(search) || 
                    (c.cnic_id || '').toLowerCase().includes(search) || 
                    (c.address || '').toLowerCase().includes(search) || 
                    (c.package_name || '').toLowerCase().includes(search);

                var isActive = self.isSubscriberActive(c);
                var matchesStatus = true;
                if (statusFilter === 'active') matchesStatus = isActive;
                else if (statusFilter === 'inactive') matchesStatus = !isActive;

                return matchesSearch && matchesStatus;
            });

            var totalCount = custs.length;
            var activeCount = custs.filter(function(c) { return self.isSubscriberActive(c); }).length;
            var inactiveCount = totalCount - activeCount;

            $('#count-total').text(totalCount);
            $('#count-active').text(activeCount);
            $('#count-inactive').text(inactiveCount);

            var rows = '';
            if (filtered.length > 0) {
                filtered.forEach(function(c) {
                    var isActive = self.isSubscriberActive(c);
                    var statusBadge = isActive ? '<span class="badge badge-active">🟢 Active</span>' : '<span class="badge badge-suspended">🔴 Expired</span>';
                    var alertBtn = '';
                    var connBadge = (c.conn_status === 'Offline' || !isActive) ? '<span class="badge badge-suspended">🔴 Offline</span>' : '<span class="badge badge-active">🟢 Online</span>';

                    if (!isActive) {
                        var cleanPhone = (c.phone_number || '').replace(/^0/, '92');
                        var alertTextRaw = '🚨 *KHAN TELECOM PACKAGE EXPIRY ALERT* 🚨\n----------------------------------\nDear Subscriber: *' + c.full_name + '*\nSubscriber ID: *' + c.customer_code + '*\nArea/Address: *' + (c.address || c.area_sector) + '*\n\n⚠️ Your Broadband Package (*' + (c.package_name || 'Premier-5') + '*) has *EXPIRED*.\nExpiration Date: *' + (c.expiry_date || 'N/A') + '*\n\n💡 Please renew your monthly package fee (PKR ' + (c.monthly_due || 1200) + ') to continue enjoying internet service.\n==================================\nContact Khan Telecom Office for instant renewal.';
                        var waAlertUrl = 'https://wa.me/' + cleanPhone + '?text=' + encodeURIComponent(alertTextRaw);

                        alertBtn = '<a href="' + waAlertUrl + '" target="_blank" class="btn btn-sm btn-whatsapp btn-send-alert-wa" title="Send WhatsApp Expiry Alert">🚨 WhatsApp</a>';
                    }

                    rows += '<tr>' +
                        '<td><code>' + (c.customer_code || 'k026-user') + '</code></td>' +
                        '<td><strong>' + c.full_name + '</strong></td>' +
                        '<td>' + (c.phone_number || 'N/A') + '</td>' +
                        '<td><small style="color:var(--text-muted);">' + (c.cnic_id || 'N/A') + '</small></td>' +
                        '<td><span class="badge" style="background:rgba(56, 139, 253, 0.15); color:var(--accent);">' + (c.package_name || 'Premier-5') + '</span></td>' +
                        '<td><code>' + (c.account_password || c.password || '1234') + '</code></td>' +
                        '<td><small style="color:var(--text-muted);">' + (c.nas_server || c.nas || 'K030-BRAS2') + '</small></td>' +
                        '<td>' + connBadge + '</td>' +
                        '<td>' + statusBadge + '</td>' +
                        '<td><strong style="color:#7ee787;">PKR ' + parseFloat(c.monthly_due || c.package_price || 0).toLocaleString() + '</strong></td>' +
                        '<td><small style="color:var(--text-muted);">' + (c.expiry_date || 'N/A') + '</small></td>' +
                        '<td><small style="color:var(--text-muted); max-width:180px; display:inline-block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="' + (c.address || '') + '">' + (c.address || c.area_sector || 'N/A') + '</small></td>' +
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
                rows = '<tr><td colspan="13" style="text-align:center; color: var(--text-muted);">No subscribers match search filter.</td></tr>';
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
                    if (localStorage.getItem('kt_is_reset') === 'true' && res.data.length === 0) {
                        localCusts = [];
                    } else {
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
                    }
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

        /* ==================== 8. SETTINGS & MEMBER SHEET IMPORT VIEW ==================== */
        loadSettingsView: function() {
            var html = `
                <div class="section-header">
                    <div>
                        <h2 class="section-title">System Settings & Bulk Subscriber Import</h2>
                        <p style="font-size:12px; color: var(--text-muted);">Upload your Member Sheet (CSV / Excel / JSON) to import subscribers in bulk, or manage database backups and ISP configuration.</p>
                    </div>
                </div>

                <div class="grid-2" style="gap:20px; margin-bottom:24px;">
                    <!-- Member Sheet Importer Box -->
                    <div class="card" style="padding:20px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius:12px;">
                        <h3 style="margin-top:0; font-size:18px; color:var(--text-main); display:flex; align-items:center; gap:8px;">
                            <span>📁</span> Upload Subscriber Member Sheet
                        </h3>
                        <p style="font-size:13px; color:var(--text-muted); margin-bottom:16px;">
                            Supported Formats: <code>.csv</code>, <code>.xlsx</code>, <code>.xls</code>, <code>.json</code>.<br>
                            Supported Columns: <strong>Subscriber Code, Full Name, Phone, CNIC, Area Sector, Address, Package Name, Assigned IP, Status</strong>.
                        </p>

                        <div id="drop-zone-container" style="border: 2px dashed var(--accent); border-radius:12px; padding:30px 20px; text-align:center; cursor:pointer; background: rgba(56, 139, 253, 0.05); transition: background 0.2s ease;">
                            <div style="font-size:40px; margin-bottom:8px;">📥</div>
                            <h4 style="margin:0 0 6px 0; font-size:15px; color:var(--text-main);">Click or Drag & Drop Member Sheet Here</h4>
                            <p style="margin:0; font-size:12px; color:var(--text-muted);">Select CSV or Excel Member Sheet file from your computer</p>
                        </div>

                        <input type="file" id="member-sheet-input" accept=".csv, .xlsx, .xls, .json, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" style="display:none;">

                        <div style="margin-top:16px; display:flex; gap:10px; flex-wrap:wrap;">
                            <button type="button" id="btn-download-sample-csv" class="btn btn-secondary btn-sm">📋 Download Sample CSV Template</button>
                            <button type="button" id="btn-browse-file" class="btn btn-primary btn-sm">📁 Select File</button>
                        </div>

                        <div id="file-upload-status-box"></div>
                    </div>

                    <!-- System Backup & Database Control Card -->
                    <div class="card" style="padding:20px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius:12px;">
                        <h3 style="margin-top:0; font-size:18px; color:var(--text-main); display:flex; align-items:center; gap:8px;">
                            <span>💾</span> Database Management & Local Backup
                        </h3>
                        <p style="font-size:13px; color:var(--text-muted); margin-bottom:16px;">
                            Export full ERP database snapshot or reset data to initial defaults.
                        </p>

                        <div style="display:flex; flex-direction:column; gap:12px;">
                            <button id="btn-detect-duplicates" onclick="KT_App.detectDuplicateSubscribers()" class="btn btn-warning" style="font-weight:600;">🔁 Double Entry / Clean Duplicates</button>
                            <button id="btn-export-db-json" class="btn btn-secondary">📥 Export Full Database JSON</button>
                            <label class="btn btn-secondary" style="margin:0; text-align:center; cursor:pointer;">
                                📤 Restore Database JSON
                                <input type="file" id="restore-db-json-input" accept=".json" style="display:none;">
                            </label>
                            <button id="btn-reset-demo-data" class="btn btn-outline-danger">🗑️ Completely Reset & Wipe All ERP Data (Clear to 0)</button>
                        </div>
                    </div>
                </div>

                <!-- ISP Profile & Automation Settings Card -->
                <div class="card" style="padding:20px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius:12px; margin-bottom:24px;">
                    <h3 style="margin-top:0; font-size:18px; color:var(--text-main); display:flex; align-items:center; gap:8px;">
                        <span>⚙️</span> ISP System Profile & Billing Automation
                    </h3>
                    <p style="font-size:13px; color:var(--text-muted); margin-bottom:16px;">
                        Configure telecom company name, helpline contact numbers, NAS router IP, and automated subscriber expiry locks.
                    </p>

                    <form id="form-isp-settings">
                        <div class="grid-2" style="gap:16px;">
                            <div class="form-group">
                                <label class="form-label">ISP Telecom Brand Name</label>
                                <input type="text" id="setting-isp-name" class="form-control" value="Khan Telecom & Fiber Systems" placeholder="e.g. Khan Telecom">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Support Helpline Phone / WhatsApp</label>
                                <input type="text" id="setting-support-phone" class="form-control" value="+92 300 1234567" placeholder="+92 300 1234567">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Head Office Address</label>
                                <input type="text" id="setting-isp-address" class="form-control" value="Sector F-11, Main Fiber Hub, Lahore" placeholder="Address">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Primary NAS Router IP</label>
                                <input type="text" id="setting-nas-ip" class="form-control" value="192.168.10.1" placeholder="192.168.10.1">
                            </div>
                            <div class="form-group">
                                <label class="form-label">MikroTik Router API Port</label>
                                <input type="number" id="setting-nas-port" class="form-control" value="8728" placeholder="8728">
                            </div>
                            <div class="form-group" style="display:flex; flex-direction:column; justify-content:center; gap:8px;">
                                <label style="display:flex; align-items:center; gap:8px; font-size:13px; cursor:pointer; color:var(--text-main);">
                                    <input type="checkbox" id="setting-auto-suspend" checked> 🔒 Auto-Suspend Expired Subscribers
                                </label>
                                <label style="display:flex; align-items:center; gap:8px; font-size:13px; cursor:pointer; color:var(--text-main);">
                                    <input type="checkbox" id="setting-auto-wa" checked> 📱 Send Automatic WhatsApp Billing Reminders
                                </label>
                            </div>
                        </div>
                        <div style="margin-top:16px; text-align:right;">
                            <button type="button" id="btn-save-isp-settings" class="btn btn-primary btn-lg">💾 Save & Lock ISP System Settings</button>
                        </div>
                    </form>
                </div>

                <!-- Parsed Preview Sheet Table Section -->
                <div id="import-preview-section" style="display:none; margin-top:20px;">
                    <div class="section-header">
                        <div>
                            <h3 style="margin:0; font-size:16px; color:var(--text-main);">Sheet Data Preview (<span id="preview-row-count">0</span> Subscribers Found)</h3>
                            <p style="font-size:12px; color:var(--text-muted); margin:4px 0 0 0;">Review parsed subscriber records before uploading to ERP engine.</p>
                        </div>
                        <button id="btn-confirm-bulk-import" class="btn btn-success btn-lg">🚀 Import All Subscribers to ERP System</button>
                    </div>

                    <div class="kt-table-container" style="max-height:350px; overflow-y:auto;">
                        <table class="kt-table">
                            <thead>
                                <tr>
                                    <th>Account ID / Secret</th>
                                    <th>Profile Name</th>
                                    <th>Phone / WhatsApp</th>
                                    <th>CNIC / Identity</th>
                                    <th>Package Tier</th>
                                    <th>Password</th>
                                    <th>NAS Server</th>
                                    <th>C.Status</th>
                                    <th>Profile Status</th>
                                    <th>Monthly Due</th>
                                    <th>Expiration Date</th>
                                    <th>Address / Sector</th>
                                </tr>
                            </thead>
                            <tbody id="preview-table-body">
                            </tbody>
                        </table>
                    </div>
                </div>
            `;

            $('#kt-view-loader').hide();
            $('#kt-view-content').html(html).show();

            var saved = {};
            try { saved = JSON.parse(localStorage.getItem('kt_isp_settings') || '{}'); } catch(e) {}
            
            $.post(ktConfig.ajaxUrl, { action: 'kt_get_isp_settings', nonce: ktConfig.nonce }, function(res) {
                if (res && res.success && res.data && res.data.settings) {
                    var s = res.data.settings;
                    $('#setting-isp-name').val(s.isp_name || saved.isp_name || 'Khan Telecom & Fiber Systems');
                    $('#setting-support-phone').val(s.support_phone || saved.support_phone || '+92 300 1234567');
                    $('#setting-isp-address').val(s.isp_address || saved.isp_address || 'Sector F-11, Main Fiber Hub, Lahore');
                    $('#setting-nas-ip').val(s.nas_primary_ip || saved.nas_primary_ip || '192.168.10.1');
                    $('#setting-nas-port').val(s.nas_api_port || saved.nas_api_port || 8728);
                    $('#setting-auto-suspend').prop('checked', s.auto_suspend_expired !== false);
                    $('#setting-auto-wa').prop('checked', s.auto_sms_reminders !== false);
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
                    '</div>' +
                '</div>';

                waTextRaw = '⚡ *KHAN TELECOM* ⚡\n_HIGH-SPEED BROADBAND PROVIDER_\n----------------------------------\n*RECEIPT NO:* ' + inv.invoice_number + '\n*DATE:* ' + (inv.paid_at || 'Just Now') + '\n*SUBSCRIBER ID:* ' + inv.customer_code + '\n*NAME:* ' + inv.full_name + '\n*PHONE:* ' + inv.phone_number + '\n*AREA:* ' + inv.area_sector + '\n----------------------------------\n*BILLING MONTH:* ' + inv.billing_month + '\n*AMOUNT DUE:* PKR ' + parseFloat(inv.amount_due).toFixed(2) + '\n*AMOUNT PAID:* PKR ' + parseFloat(inv.amount_paid).toFixed(2) + '\n*PAYMENT METHOD:* ' + (inv.payment_method || 'cash').toUpperCase().replace('_', ' ') + '\n*STATUS:* ' + (inv.payment_status || 'PAID').toUpperCase() + ' ✅\n----------------------------------\n*COLLECTOR:* ' + (inv.collector_name || activeUser) + '\n==================================\nThank you for choosing Khan Telecom!';
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

        /* ==================== 9. DOUBLE ENTRY DUPLICATE DETECTION & CLEAN MERGE ==================== */
        detectDuplicateSubscribers: function() {
            var self = this;
            $('#btn-detect-duplicates').html('⏳ Real-Time Scanning Database...').prop('disabled', true);

            this.fetchCustomers(function(customers) {
                $('#btn-detect-duplicates').html('🔁 Double Entry / Clean Duplicates').prop('disabled', false);

                if (!customers || customers.length === 0) {
                    self.showToast('No subscriber records found to scan.', 'warning');
                    return;
                }

                var parent = {};
                function find(i) {
                    if (parent[i] === undefined) parent[i] = i;
                    if (parent[i] === i) return i;
                    parent[i] = find(parent[i]);
                    return parent[i];
                }
                function union(i, j) {
                    var rootI = find(i);
                    var rootJ = find(j);
                    if (rootI !== rootJ) {
                        parent[rootI] = rootJ;
                    }
                }

                function normCode(val) {
                    if (!val) return '';
                    return (val + '').toLowerCase().replace(/[^a-z0-9]/g, '').replace(/^kt/, '');
                }

                function normPhone(val) {
                    if (!val) return '';
                    var d = (val + '').replace(/[^0-9]/g, '');
                    if (d.startsWith('92')) d = d.substring(2);
                    if (d.startsWith('0')) d = d.substring(1);
                    return d.length >= 7 ? d : '';
                }

                function normCnic(val) {
                    if (!val) return '';
                    var d = (val + '').replace(/[^0-9]/g, '');
                    return d.length >= 8 ? d : '';
                }

                function normName(val) {
                    if (!val) return '';
                    return (val + '').toLowerCase().replace(/[^a-z0-9]/g, '');
                }

                var codeMap = {};
                var phoneMap = {};
                var cnicMap = {};
                var nameMap = {};
                var matchReasons = {};

                customers.forEach(function(c, idx) {
                    var cId = c.id || ('idx_' + idx);
                    parent[cId] = cId;

                    var cCode = normCode(c.customer_code);
                    var cPhone = normPhone(c.phone_number);
                    var cCnic = normCnic(c.cnic_id);
                    var cName = normName(c.full_name);

                    if (cCode) {
                        if (codeMap[cCode] !== undefined) {
                            union(cId, codeMap[cCode]);
                            matchReasons[find(cId)] = 'Account Code (' + (c.customer_code || cCode) + ')';
                        } else {
                            codeMap[cCode] = cId;
                        }
                    }

                    if (cPhone) {
                        if (phoneMap[cPhone] !== undefined) {
                            union(cId, phoneMap[cPhone]);
                            if (!matchReasons[find(cId)]) matchReasons[find(cId)] = 'Phone Number (' + c.phone_number + ')';
                        } else {
                            phoneMap[cPhone] = cId;
                        }
                    }

                    if (cCnic) {
                        if (cnicMap[cCnic] !== undefined) {
                            union(cId, cnicMap[cCnic]);
                            if (!matchReasons[find(cId)]) matchReasons[find(cId)] = 'CNIC Identity (' + c.cnic_id + ')';
                        } else {
                            cnicMap[cCnic] = cId;
                        }
                    }

                    if (cName && cName.length >= 4) {
                        if (nameMap[cName] !== undefined) {
                            union(cId, nameMap[cName]);
                            if (!matchReasons[find(cId)]) matchReasons[find(cId)] = 'Name & Profile (' + c.full_name + ')';
                        } else {
                            nameMap[cName] = cId;
                        }
                    }
                });

                var groupsByRoot = {};
                customers.forEach(function(c, idx) {
                    var cId = c.id || ('idx_' + idx);
                    var root = find(cId);
                    if (!groupsByRoot[root]) groupsByRoot[root] = [];
                    groupsByRoot[root].push(c);
                });

                var duplicateGroups = [];
                Object.keys(groupsByRoot).forEach(function(root) {
                    var items = groupsByRoot[root];
                    if (items.length > 1) {
                        items.sort(function(a, b) {
                            var aScore = (self.isSubscriberActive(a) ? 100 : 0) + (a.cnic_id ? 10 : 0) + (a.assigned_ip_ipoe ? 10 : 0) + (parseInt(a.id) || 0);
                            var bScore = (self.isSubscriberActive(b) ? 100 : 0) + (b.cnic_id ? 10 : 0) + (b.assigned_ip_ipoe ? 10 : 0) + (parseInt(b.id) || 0);
                            return bScore - aScore;
                        });

                        var reason = matchReasons[root] || 'Account / Phone / Name match';
                        duplicateGroups.push({
                            criteria: reason,
                            primary: items[0],
                            duplicates: items.slice(1)
                        });
                    }
                });

                self.detectedDuplicateGroups = duplicateGroups;
                self.showDuplicatesModal(duplicateGroups);
            });
        },

        showDuplicatesModal: function(groups) {
            var tbody = $('#duplicates-table-body');
            tbody.empty();

            if (!groups || groups.length === 0) {
                $('#duplicates-scan-status').html('✅ <strong>Great news! Zero duplicate / double entry subscribers found.</strong> Your ERP database is 100% clean!');
                tbody.html('<tr><td colspan="4" style="text-align:center; padding:30px; color:var(--text-muted);">🎉 Zero duplicate subscribers detected! Everything is clean.</td></tr>');
                $('#btn-execute-merge-duplicates').prop('disabled', true).css('opacity', '0.5');
            } else {
                $('#duplicates-scan-status').html('⚠️ Found <strong>' + groups.length + ' Double Entry Subscriber Groups</strong>. Review primary vs duplicate accounts below and click Replace & Merge.');
                $('#btn-execute-merge-duplicates').prop('disabled', false).css('opacity', '1');

                groups.forEach(function(g, idx) {
                    var primary = g.primary;
                    var dupNames = g.duplicates.map(function(d) {
                        return '<div style="margin-bottom:4px;"><span class="badge badge-suspended">🔴 Duplicate</span> <strong>' + d.full_name + '</strong> (ID: ' + (d.customer_code || d.id) + ' | Phone: ' + (d.phone_number || 'N/A') + ')</div>';
                    }).join('');

                    var rowHtml = '<tr>' +
                        '<td><input type="checkbox" class="chk-duplicate-group" data-group-index="' + idx + '" checked></td>' +
                        '<td><span class="badge badge-warning" style="font-size:11px;">' + g.criteria + '</span></td>' +
                        '<td>' +
                            '<span class="badge badge-active">🟢 Primary (Keep)</span> <strong>' + primary.full_name + '</strong><br>' +
                            '<small style="color:var(--text-muted);">Code: <code>' + (primary.customer_code || primary.id) + '</code> | Phone: ' + primary.phone_number + ' | Sector: ' + (primary.area_sector || 'N/A') + '</small>' +
                        '</td>' +
                        '<td>' + dupNames + '</td>' +
                    '</tr>';
                    tbody.append(rowHtml);
                });
            }

            $('#kt-modal-backdrop').show();
            $('#kt-duplicates-modal').css('display', 'flex');
        },

        executeMergeDuplicates: function() {
            var self = this;
            var groups = this.detectedDuplicateGroups || [];
            var selectedIndices = [];

            $('.chk-duplicate-group:checked').each(function() {
                selectedIndices.push(parseInt($(this).data('group-index')));
            });

            if (selectedIndices.length === 0) {
                this.showToast('Please select at least one duplicate group to merge.', 'warning');
                return;
            }

            if (!confirm('Are you sure you want to merge ' + selectedIndices.length + ' duplicate subscriber group(s)? Duplicate entries will be removed and their payment history will be merged into primary accounts.')) {
                return;
            }

            this.fetchCustomers(function(customers) {
                self.fetchInvoices(function(invoices) {
                    var duplicateCustomerIdsToRemove = [];
                    var totalMergedCount = 0;

                    selectedIndices.forEach(function(idx) {
                        var g = groups[idx];
                        if (g) {
                            var primaryId = g.primary.id;
                            var primaryCode = g.primary.customer_code || g.primary.id;

                            g.duplicates.forEach(function(dup) {
                                duplicateCustomerIdsToRemove.push(dup.id);
                                totalMergedCount++;

                                invoices.forEach(function(inv) {
                                    if (inv.customer_id === dup.id || inv.customer_code === dup.customer_code) {
                                        inv.customer_id = primaryId;
                                        inv.customer_code = primaryCode;
                                        inv.full_name = g.primary.full_name;
                                    }
                                });
                            });
                        }
                    });

                    var cleanedCustomers = customers.filter(function(c) {
                        return !duplicateCustomerIdsToRemove.includes(c.id);
                    });

                    localStorage.setItem('kt_storage_customers', JSON.stringify(cleanedCustomers));
                    localStorage.setItem('kt_storage_invoices', JSON.stringify(invoices));

                    var user = self.getUserSession();
                    $.post(ktConfig.ajaxUrl, {
                        action: 'kt_merge_duplicates',
                        nonce: ktConfig.nonce,
                        user_id: user.user_id,
                        user_name: encodeURIComponent(user.display_name),
                        user_role: user.role_level,
                        customers: JSON.stringify(cleanedCustomers),
                        invoices: JSON.stringify(invoices)
                    }, function(res) {
                        $('#kt-duplicates-modal, #kt-modal-backdrop').hide();
                        self.showToast('⚡ Successfully merged ' + totalMergedCount + ' double entry subscriber records!', 'success');
                        self.renderCustomersTable(cleanedCustomers);
                        if (self.currentView === 'settings') {
                            self.loadSettingsView();
                        }
                    }).fail(function() {
                        $('#kt-duplicates-modal, #kt-modal-backdrop').hide();
                        self.showToast('⚡ Duplicate entries merged locally!', 'success');
                        self.renderCustomersTable(cleanedCustomers);
                    });
                });
            });
        },
    };


    window.KT_App = KT_App;
    $(document).ready(function() {
        KT_App.init();
    });

})(jQuery);
