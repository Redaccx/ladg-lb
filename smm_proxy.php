<?php
header('Content-Type: application/json');

$api_url = "https://smmreal.com/api/v2";
$api_key = "0c45a2a7372f143917862d0ac9330e4d";

$action = $_POST['action'] ?? '';
$service = $_POST['service'] ?? '';
$link = $_POST['link'] ?? '';
$quantity = $_POST['quantity'] ?? '';

$postData = [
    'key' => $api_key,
    'action' => $action
];

if($service) $postData['service'] = $service;
if($link) $postData['link'] = $link;
if($quantity) $postData['quantity'] = $quantity;

$ch = curl_init($api_url);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postData));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // مهم عند بعض الاستضافات
$response = curl_exec($ch);
curl_close($ch);

echo $response;
