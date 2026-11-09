-- --------------------------------------------------------
-- Host:                         roundhouse.proxy.rlwy.net
-- Versión del servidor:         8.4.13 - MySQL Community Server - GPL
-- SO del servidor:              Linux
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

-- Volcando datos para la tabla railway.abonos_apartados: ~0 rows (aproximadamente)

-- Volcando datos para la tabla railway.apartados: ~0 rows (aproximadamente)

-- Volcando datos para la tabla railway.detalle_apartados: ~0 rows (aproximadamente)

-- Volcando datos para la tabla railway.productos: ~3 rows (aproximadamente)
INSERT INTO `productos` (`id`, `nombre`, `precio_compra`, `precio_venta`, `stock_actual`, `creado_en`, `talla`, `imagen`) VALUES
	(3, 'Sudadera Essential', 450.00, 690.00, 20, '2026-11-04 17:16:23', 'XS, S, M, G, EX', ''),
	(4, 'Chamarra Yhisai', 300.00, 550.00, 24, '2026-11-07 03:37:07', '6, 8, 10, 12, 14, 16', ''),
	(5, 'Chamarra comisso', 320.00, 590.00, 30, '2026-11-08 00:42:47', '6, 8, 10, 12, 14, 16', '');

-- Volcando datos para la tabla railway.ventas_diarias: ~4 rows (aproximadamente)
INSERT INTO `ventas_diarias` (`id`, `producto_id`, `cantidad_vendida`, `ganancia_neta_total`, `fecha_venta`, `precio_total_venta`, `monto_pagado`, `monto_pendiente`, `estado_pago`, `talla_vendida`) VALUES
	(4, 3, 1, 240.00, '2026-10-30 10:17:00', 690.00, 690.00, 0.00, 'Liquidado', 'M'),
	(5, 3, 1, 240.00, '2026-11-01 19:40:00', 690.00, 500.00, 190.00, 'Pendiente de Liquidación', 'XS'),
	(6, 3, 1, 240.00, '2026-11-01 19:40:00', 690.00, 0.00, 690.00, 'Pendiente de Liquidación', 'M'),
	(7, 3, 1, 240.00, '2026-11-07 16:39:00', 690.00, 690.00, 0.00, 'Liquidado', 'L');

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
