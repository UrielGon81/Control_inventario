-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Versión del servidor:         13.0.2-MariaDB - MariaDB Server
-- SO del servidor:              Win64
-- HeidiSQL Versión:             12.20.0.7320
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

-- Volcando datos para la tabla control_inventario_db.productos: ~1 rows (aproximadamente)
INSERT INTO `productos` (`id`, `nombre`, `precio_compra`, `precio_venta`, `stock_actual`, `creado_en`, `talla`, `imagen`) VALUES
	(2, 'Sudaderas Essentials', 450.00, 690.00, 21, '2026-11-03 17:13:28', 'XS, M, G, EG', 'https://fearofgod.com/cdn/shop/files/MARCH26_M_L58_P_7317.jpg?v=1776266105&width=2400');

-- Volcando datos para la tabla control_inventario_db.ventas_diarias: ~3 rows (aproximadamente)
INSERT INTO `ventas_diarias` (`id`, `producto_id`, `cantidad_vendida`, `ganancia_neta_total`, `fecha_venta`, `precio_total_venta`, `monto_pagado`, `monto_pendiente`, `estado_pago`, `talla_vendida`) VALUES
	(1, 2, 1, 240.00, '2026-11-03 11:18:33', 0.00, 0.00, 0.00, 'Pendiente', 'Única'),
	(2, 2, 1, 240.00, '2026-11-01 19:00:00', 690.00, 500.00, 190.00, 'Pendiente de Liquidación', 'XS'),
	(3, 2, 1, 240.00, '2026-11-01 19:00:00', 690.00, 0.00, 690.00, 'Pendiente de Liquidación', 'M');

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
