<?php
/**
 * Plugin Name:       Khan Telecom ISP Manager
 * Plugin URI:        https://khantelecom.com
 * Description:       Standalone Multi-Tier Internet Service Provider (ISP) Management Engine & Mobile PWA App Shell.
 * Version:           1.0.0
 * Author:            Saif
 * Author URI:        https://khantelecom.com
 * Text Domain:       khan-telecom-isp-manager
 * Requires at least: 5.8
 * Requires PHP:      7.4
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly.
}

// Define Plugin Constants
define('KT_VERSION', '1.0.0');
define('KT_PLUGIN_FILE', __FILE__);
define('KT_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('KT_PLUGIN_URL', plugin_dir_url(__FILE__));
define('KT_PAGE_SLUG', 'khan-telecom-portal');

// Require Class Files
require_once KT_PLUGIN_DIR . 'includes/class-kt-db.php';
require_once KT_PLUGIN_DIR . 'includes/class-kt-rbac.php';
require_once KT_PLUGIN_DIR . 'includes/class-kt-receipt-engine.php';
require_once KT_PLUGIN_DIR . 'includes/class-kt-ajax.php';
require_once KT_PLUGIN_DIR . 'includes/class-kt-app-shell.php';

/**
 * Plugin Activation Callback
 */
function kt_activate_plugin() {
    // 1. Install & Update Custom MySQL DB Tables
    KT_DB::install();

    // 2. Programmatically create standalone portal page if it doesn't exist
    $page_title   = 'Khan Telecom Portal';
    $page_slug    = KT_PAGE_SLUG;
    $page_check   = get_page_by_path($page_slug);

    if (!$page_check) {
        $page_id = wp_insert_post(array(
            'post_title'     => $page_title,
            'post_name'      => $page_slug,
            'post_content'   => '[khan_telecom_app]',
            'post_status'    => 'publish',
            'post_type'      => 'page',
            'comment_status' => 'closed',
            'ping_status'    => 'closed',
        ));
    }

    // 3. Register Rewrite Rules & Flush
    add_rewrite_rule('^khan-telecom-portal/?$', 'index.php?pagename=' . KT_PAGE_SLUG, 'top');
    flush_rewrite_rules();
}
register_activation_hook(__FILE__, 'kt_activate_plugin');

/**
 * Plugin Deactivation Callback
 */
function kt_deactivate_plugin() {
    flush_rewrite_rules();
}
register_deactivation_hook(__FILE__, 'kt_deactivate_plugin');

/**
 * Initialize Plugin Core Modules
 */
function kt_init_plugin() {
    KT_RBAC::init();
    KT_AJAX::init();
    KT_App_Shell::init();
}
add_action('plugins_loaded', 'kt_init_plugin');
