-- Usar la base de datos de Railway
USE railway;

-- Desactivar temporalmente restricciones de llaves foráneas
SET FOREIGN_KEY_CHECKS=0;

-- Crear la tabla productos si no existe
CREATE TABLE IF NOT EXISTS `productos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) NOT NULL,
  `precio_compra` decimal(10,2) NOT NULL,
  `precio_venta` decimal(10,2) NOT NULL,
  `stock_actual` int(11) NOT NULL,
  `creado_en` datetime DEFAULT CURRENT_TIMESTAMP,
  `talla` varchar(100) DEFAULT 'Única',
  `imagen` text DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Crear la tabla ventas_diarias si no existe
CREATE TABLE IF NOT EXISTS `ventas_diarias` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `producto_id` int(11) NOT NULL,
  `cantidad_vendida` int(11) NOT NULL,
  `ganancia_neta_total` decimal(10,2) NOT NULL,
  `fecha_venta` datetime NOT NULL,
  `precio_total_venta` decimal(10,2) NOT NULL,
  `monto_pagado` decimal(10,2) NOT NULL,
  `monto_pendiente` decimal(10,2) NOT NULL,
  `estado_pago` varchar(50) NOT NULL,
  `talla_vendida` varchar(50) DEFAULT 'Única',
  PRIMARY KEY (`id`),
  KEY `producto_id` (`producto_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Limpiar datos previos para evitar duplicados al reimportar
TRUNCATE TABLE `ventas_diarias`;
TRUNCATE TABLE `productos`;

-- Insertar datos en productos
INSERT INTO `productos` (`id`, `nombre`, `precio_compra`, `precio_venta`, `stock_actual`, `creado_en`, `talla`, `imagen`) VALUES
(2, 'Sudaderas Essentials', 450.00, 690.00, 21, '2026-11-03 17:13:28', 'XS, M, G, EG', 'https://fearofgod.com/cdn/shop/files/MARCH26_M_L58_P_7317.jpg?v=1776266105&width=2400');

-- Insertar datos en ventas_diarias
INSERT INTO `ventas_diarias` (`id`, `producto_id`, `cantidad_vendida`, `ganancia_neta_total`, `fecha_venta`, `precio_total_venta`, `monto_pagado`, `monto_pendiente`, `estado_pago`, `talla_vendida`) VALUES
(1, 2, 1, 240.00, '2026-11-03 11:18:33', 0.00, 0.00, 0.00, 'Pendiente', 'Única'),
(2, 2, 1, 240.00, '2026-11-01 19:00:00', 690.00, 500.00, 190.00, 'Pendiente de Liquidación', 'XS'),
(3, 2, 1, 240.00, '2026-11-01 19:00:00', 690.00, 0.00, 690.00, 'Pendiente de Liquidación', 'M');

-- Reactivar restricciones
SET FOREIGN_KEY_CHECKS=1;