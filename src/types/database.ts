export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          apartment: string | null
          city: string
          created_at: string
          floor: string | null
          id: string
          is_default: boolean | null
          label: string | null
          lat: number | null
          lng: number | null
          number: string
          postal_code: string
          profile_id: string
          province: string
          reference: string | null
          street: string
        }
        Insert: {
          apartment?: string | null
          city: string
          created_at?: string
          floor?: string | null
          id?: string
          is_default?: boolean | null
          label?: string | null
          lat?: number | null
          lng?: number | null
          number: string
          postal_code: string
          profile_id: string
          province: string
          reference?: string | null
          street: string
        }
        Update: {
          apartment?: string | null
          city?: string
          created_at?: string
          floor?: string | null
          id?: string
          is_default?: boolean | null
          label?: string | null
          lat?: number | null
          lng?: number | null
          number?: string
          postal_code?: string
          profile_id?: string
          province?: string
          reference?: string | null
          street?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_accounts: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          business_name: string
          created_at: string
          credit_limit: number | null
          cuit: string
          current_balance: number | null
          domicilio_fiscal: string | null
          id: string
          iva_condition: string | null
          notes: string | null
          profile_id: string
          status: Database["public"]["Enums"]["b2b_status"]
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          business_name: string
          created_at?: string
          credit_limit?: number | null
          cuit: string
          current_balance?: number | null
          domicilio_fiscal?: string | null
          id?: string
          iva_condition?: string | null
          notes?: string | null
          profile_id: string
          status?: Database["public"]["Enums"]["b2b_status"]
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          business_name?: string
          created_at?: string
          credit_limit?: number | null
          cuit?: string
          current_balance?: number | null
          domicilio_fiscal?: string | null
          id?: string
          iva_condition?: string | null
          notes?: string | null
          profile_id?: string
          status?: Database["public"]["Enums"]["b2b_status"]
        }
        Relationships: [
          {
            foreignKeyName: "b2b_accounts_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "b2b_accounts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      canales: {
        Row: {
          activo: boolean
          created_at: string | null
          descuento_pct: number
          id: string
          margen_premium: number | null
          margen_std: number | null
          margen_venta_directa: number
          markup_pvp: number | null
          nombre: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          activo?: boolean
          created_at?: string | null
          descuento_pct?: number
          id?: string
          margen_premium?: number | null
          margen_std?: number | null
          margen_venta_directa?: number
          markup_pvp?: number | null
          nombre: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          activo?: boolean
          created_at?: string | null
          descuento_pct?: number
          id?: string
          margen_premium?: number | null
          margen_std?: number | null
          margen_venta_directa?: number
          markup_pvp?: number | null
          nombre?: string
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      categorias_insumos: {
        Row: {
          color: string
          created_at: string
          id: string
          nombre: string
          orden: number
          valor: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          nombre: string
          orden?: number
          valor: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          nombre?: string
          orden?: number
          valor?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      cc_movimientos: {
        Row: {
          cliente_id: string
          created_at: string
          created_by: string | null
          descripcion: string
          factura_id: string | null
          fecha: string
          id: string
          monto: number
          order_id: string | null
          referencia: string | null
          tipo: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          created_by?: string | null
          descripcion: string
          factura_id?: string | null
          fecha?: string
          id?: string
          monto: number
          order_id?: string | null
          referencia?: string | null
          tipo: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          created_by?: string | null
          descripcion?: string
          factura_id?: string | null
          fecha?: string
          id?: string
          monto?: number
          order_id?: string | null
          referencia?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "cc_movimientos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cc_movimientos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cc_movimientos_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cc_movimientos_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      cheques: {
        Row: {
          banco: string
          cc_movimiento_id: string | null
          cliente_id: string
          created_at: string
          created_by: string | null
          estado: string
          fecha_acreditacion: string
          fecha_emision: string
          id: string
          librador: string | null
          monto: number
          numero_cheque: string
          observaciones: string | null
          updated_at: string
        }
        Insert: {
          banco: string
          cc_movimiento_id?: string | null
          cliente_id: string
          created_at?: string
          created_by?: string | null
          estado?: string
          fecha_acreditacion: string
          fecha_emision: string
          id?: string
          librador?: string | null
          monto: number
          numero_cheque: string
          observaciones?: string | null
          updated_at?: string
        }
        Update: {
          banco?: string
          cc_movimiento_id?: string | null
          cliente_id?: string
          created_at?: string
          created_by?: string | null
          estado?: string
          fecha_acreditacion?: string
          fecha_emision?: string
          id?: string
          librador?: string | null
          monto?: number
          numero_cheque?: string
          observaciones?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cheques_cc_movimiento_id_fkey"
            columns: ["cc_movimiento_id"]
            isOneToOne: false
            referencedRelation: "cc_movimientos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cheques_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cheques_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_logs: {
        Row: {
          cliente_id: string
          created_at: string
          id: string
          notas: string | null
          tipo: string
          vendedor_id: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          id?: string
          notas?: string | null
          tipo?: string
          vendedor_id: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          id?: string
          notas?: string | null
          tipo?: string
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_logs_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_logs_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contenido_web: {
        Row: {
          actualizado_en: string | null
          clave: string
          etiqueta: string
          seccion: string
          tipo: string
          valor: string | null
        }
        Insert: {
          actualizado_en?: string | null
          clave: string
          etiqueta: string
          seccion: string
          tipo?: string
          valor?: string | null
        }
        Update: {
          actualizado_en?: string | null
          clave?: string
          etiqueta?: string
          seccion?: string
          tipo?: string
          valor?: string | null
        }
        Relationships: []
      }
      delivery_zones: {
        Row: {
          base_fee: number
          capacidad_kg: number | null
          codigo: string | null
          estimated_minutes: number
          flete_kg: number | null
          id: string
          is_active: boolean | null
          km: number | null
          name: string
          polygon: Json
          precio_km: number | null
          updated_at: string | null
        }
        Insert: {
          base_fee: number
          capacidad_kg?: number | null
          codigo?: string | null
          estimated_minutes: number
          flete_kg?: number | null
          id?: string
          is_active?: boolean | null
          km?: number | null
          name: string
          polygon: Json
          precio_km?: number | null
          updated_at?: string | null
        }
        Update: {
          base_fee?: number
          capacidad_kg?: number | null
          codigo?: string | null
          estimated_minutes?: number
          flete_kg?: number | null
          id?: string
          is_active?: boolean | null
          km?: number | null
          name?: string
          polygon?: Json
          precio_km?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      depositos: {
        Row: {
          activo: boolean
          created_at: string
          descripcion: string | null
          direccion: string | null
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          descripcion?: string | null
          direccion?: string | null
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          descripcion?: string | null
          direccion?: string | null
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: []
      }
      devolucion_items: {
        Row: {
          cantidad: number
          descripcion: string
          devolucion_id: string
          id: string
          precio_unitario: number
          subtotal: number
        }
        Insert: {
          cantidad: number
          descripcion: string
          devolucion_id: string
          id?: string
          precio_unitario: number
          subtotal: number
        }
        Update: {
          cantidad?: number
          descripcion?: string
          devolucion_id?: string
          id?: string
          precio_unitario?: number
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "devolucion_items_devolucion_id_fkey"
            columns: ["devolucion_id"]
            isOneToOne: false
            referencedRelation: "devoluciones"
            referencedColumns: ["id"]
          },
        ]
      }
      devoluciones: {
        Row: {
          cc_movimiento_id: string | null
          cliente_id: string
          created_at: string
          created_by: string | null
          estado: string
          fecha: string
          id: string
          monto_total: number
          motivo: string
          observaciones: string | null
          pedido_id: string | null
          updated_at: string
        }
        Insert: {
          cc_movimiento_id?: string | null
          cliente_id: string
          created_at?: string
          created_by?: string | null
          estado?: string
          fecha?: string
          id?: string
          monto_total?: number
          motivo: string
          observaciones?: string | null
          pedido_id?: string | null
          updated_at?: string
        }
        Update: {
          cc_movimiento_id?: string | null
          cliente_id?: string
          created_at?: string
          created_by?: string | null
          estado?: string
          fecha?: string
          id?: string
          monto_total?: number
          motivo?: string
          observaciones?: string | null
          pedido_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "devoluciones_cc_movimiento_id_fkey"
            columns: ["cc_movimiento_id"]
            isOneToOne: false
            referencedRelation: "cc_movimientos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devoluciones_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devoluciones_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devoluciones_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      direcciones_entrega: {
        Row: {
          activo: boolean
          alias: string
          calle: string | null
          ciudad: string | null
          created_at: string | null
          es_principal: boolean
          id: string
          numero: string | null
          piso: string | null
          profile_id: string
          zona_id: string | null
        }
        Insert: {
          activo?: boolean
          alias?: string
          calle?: string | null
          ciudad?: string | null
          created_at?: string | null
          es_principal?: boolean
          id?: string
          numero?: string | null
          piso?: string | null
          profile_id: string
          zona_id?: string | null
        }
        Update: {
          activo?: boolean
          alias?: string
          calle?: string | null
          ciudad?: string | null
          created_at?: string | null
          es_principal?: boolean
          id?: string
          numero?: string | null
          piso?: string | null
          profile_id?: string
          zona_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "direcciones_entrega_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direcciones_entrega_zona_id_fkey"
            columns: ["zona_id"]
            isOneToOne: false
            referencedRelation: "delivery_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      disponibilidad_lineas: {
        Row: {
          created_at: string
          desde: string
          disponible: boolean
          hasta: string | null
          id: string
          linea_id: number
          nota: string | null
        }
        Insert: {
          created_at?: string
          desde?: string
          disponible?: boolean
          hasta?: string | null
          id?: string
          linea_id: number
          nota?: string | null
        }
        Update: {
          created_at?: string
          desde?: string
          disponible?: boolean
          hasta?: string | null
          id?: string
          linea_id?: number
          nota?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disponibilidad_lineas_linea_id_fkey"
            columns: ["linea_id"]
            isOneToOne: true
            referencedRelation: "lineas_producto"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_locations: {
        Row: {
          driver_id: string
          heading: number | null
          lat: number
          lng: number
          order_id: string | null
          speed_kmh: number | null
          updated_at: string
        }
        Insert: {
          driver_id: string
          heading?: number | null
          lat: number
          lng: number
          order_id?: string | null
          speed_kmh?: number | null
          updated_at?: string
        }
        Update: {
          driver_id?: string
          heading?: number | null
          lat?: number
          lng?: number
          order_id?: string | null
          speed_kmh?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_locations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_locations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      factura_items: {
        Row: {
          alicuota_iva: number
          cantidad: number
          descripcion: string
          factura_id: string
          id: string
          iva_monto: number
          orden: number
          precio_unitario: number
          subtotal: number
          total: number
          unidad: string
        }
        Insert: {
          alicuota_iva?: number
          cantidad: number
          descripcion: string
          factura_id: string
          id?: string
          iva_monto: number
          orden?: number
          precio_unitario: number
          subtotal: number
          total: number
          unidad?: string
        }
        Update: {
          alicuota_iva?: number
          cantidad?: number
          descripcion?: string
          factura_id?: string
          id?: string
          iva_monto?: number
          orden?: number
          precio_unitario?: number
          subtotal?: number
          total?: number
          unidad?: string
        }
        Relationships: [
          {
            foreignKeyName: "factura_items_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas"
            referencedColumns: ["id"]
          },
        ]
      }
      facturas: {
        Row: {
          cae: string | null
          cae_vencimiento: string | null
          cliente_id: string | null
          condicion_iva: string
          condicion_pago: string
          created_at: string
          created_by: string | null
          cuit: string
          domicilio_fiscal: string | null
          estado: string
          fecha_emision: string | null
          fecha_vencimiento: string | null
          id: string
          iva_105: number
          iva_21: number
          neto_gravado_105: number
          neto_gravado_21: number
          neto_no_gravado: number
          numero: number | null
          numero_afip: number | null
          observaciones: string | null
          pedido_refs: string[] | null
          punto_venta: number
          razon_social: string
          tipo: string
          total: number
          updated_at: string
        }
        Insert: {
          cae?: string | null
          cae_vencimiento?: string | null
          cliente_id?: string | null
          condicion_iva?: string
          condicion_pago?: string
          created_at?: string
          created_by?: string | null
          cuit: string
          domicilio_fiscal?: string | null
          estado?: string
          fecha_emision?: string | null
          fecha_vencimiento?: string | null
          id?: string
          iva_105?: number
          iva_21?: number
          neto_gravado_105?: number
          neto_gravado_21?: number
          neto_no_gravado?: number
          numero?: number | null
          numero_afip?: number | null
          observaciones?: string | null
          pedido_refs?: string[] | null
          punto_venta?: number
          razon_social: string
          tipo?: string
          total?: number
          updated_at?: string
        }
        Update: {
          cae?: string | null
          cae_vencimiento?: string | null
          cliente_id?: string | null
          condicion_iva?: string
          condicion_pago?: string
          created_at?: string
          created_by?: string | null
          cuit?: string
          domicilio_fiscal?: string | null
          estado?: string
          fecha_emision?: string | null
          fecha_vencimiento?: string | null
          id?: string
          iva_105?: number
          iva_21?: number
          neto_gravado_105?: number
          neto_gravado_21?: number
          neto_no_gravado?: number
          numero?: number | null
          numero_afip?: number | null
          observaciones?: string | null
          pedido_refs?: string[] | null
          punto_venta?: number
          razon_social?: string
          tipo?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "facturas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facturas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ideia_liquidations: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          orders_count: number
          paid_at: string | null
          period_end: string
          period_start: string
          status: string
          total_commission: number
          total_gmv: number
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          orders_count: number
          paid_at?: string | null
          period_end: string
          period_start: string
          status?: string
          total_commission: number
          total_gmv: number
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          orders_count?: number
          paid_at?: string | null
          period_end?: string
          period_start?: string
          status?: string
          total_commission?: number
          total_gmv?: number
        }
        Relationships: []
      }
      insumos: {
        Row: {
          categoria: string
          created_at: string | null
          id: string
          nombre: string
          notas: string | null
          precio_unitario: number
          proveedor: string | null
          punto_pedido: number
          stock_actual: number
          stock_maximo: number
          stock_minimo: number
          unidad: string
          updated_at: string | null
        }
        Insert: {
          categoria?: string
          created_at?: string | null
          id?: string
          nombre: string
          notas?: string | null
          precio_unitario?: number
          proveedor?: string | null
          punto_pedido?: number
          stock_actual?: number
          stock_maximo?: number
          stock_minimo?: number
          unidad?: string
          updated_at?: string | null
        }
        Update: {
          categoria?: string
          created_at?: string | null
          id?: string
          nombre?: string
          notas?: string | null
          precio_unitario?: number
          proveedor?: string | null
          punto_pedido?: number
          stock_actual?: number
          stock_maximo?: number
          stock_minimo?: number
          unidad?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      insumos_movimientos: {
        Row: {
          cantidad: number
          created_at: string
          created_by: string | null
          id: string
          insumo_id: string
          motivo: string
          notas: string | null
          referencia_id: string | null
          tipo: string
        }
        Insert: {
          cantidad: number
          created_at?: string
          created_by?: string | null
          id?: string
          insumo_id: string
          motivo?: string
          notas?: string | null
          referencia_id?: string | null
          tipo: string
        }
        Update: {
          cantidad?: number
          created_at?: string
          created_by?: string | null
          id?: string
          insumo_id?: string
          motivo?: string
          notas?: string | null
          referencia_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "insumos_movimientos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumos_movimientos_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
        ]
      }
      lineas_producto: {
        Row: {
          id: number
          nombre: string
          orden: number
        }
        Insert: {
          id?: number
          nombre: string
          orden: number
        }
        Update: {
          id?: number
          nombre?: string
          orden?: number
        }
        Relationships: []
      }
      lotes: {
        Row: {
          activo: boolean
          cantidad_actual: number
          cantidad_inicial: number
          costo_unitario: number | null
          created_at: string
          created_by: string | null
          deposito_id: string | null
          fecha_ingreso: string
          fecha_vencimiento: string
          id: string
          numero_lote: string
          observaciones: string | null
          producto_id: string
          proveedor: string | null
          unidad: string
        }
        Insert: {
          activo?: boolean
          cantidad_actual: number
          cantidad_inicial: number
          costo_unitario?: number | null
          created_at?: string
          created_by?: string | null
          deposito_id?: string | null
          fecha_ingreso?: string
          fecha_vencimiento: string
          id?: string
          numero_lote: string
          observaciones?: string | null
          producto_id: string
          proveedor?: string | null
          unidad?: string
        }
        Update: {
          activo?: boolean
          cantidad_actual?: number
          cantidad_inicial?: number
          costo_unitario?: number | null
          created_at?: string
          created_by?: string | null
          deposito_id?: string | null
          fecha_ingreso?: string
          fecha_vencimiento?: string
          id?: string
          numero_lote?: string
          observaciones?: string | null
          producto_id?: string
          proveedor?: string | null
          unidad?: string
        }
        Relationships: [
          {
            foreignKeyName: "lotes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lotes_deposito_id_fkey"
            columns: ["deposito_id"]
            isOneToOne: false
            referencedRelation: "depositos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lotes_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      objetivos_ventas: {
        Row: {
          anio: number
          canal: string
          created_at: string
          created_by: string | null
          id: string
          mes: number
          monto_meta: number
          updated_at: string
        }
        Insert: {
          anio: number
          canal: string
          created_at?: string
          created_by?: string | null
          id?: string
          mes: number
          monto_meta: number
          updated_at?: string
        }
        Update: {
          anio?: number
          canal?: string
          created_at?: string
          created_by?: string | null
          id?: string
          mes?: number
          monto_meta?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "objetivos_ventas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_events: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          message: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          message?: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          message?: string | null
          order_id?: string
          status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_lines: {
        Row: {
          id: string
          line_total: number
          order_id: string
          product_id: string
          product_snapshot: Json
          quantity: number
          unit_price: number
          variant_id: string | null
        }
        Insert: {
          id?: string
          line_total: number
          order_id: string
          product_id: string
          product_snapshot: Json
          quantity: number
          unit_price: number
          variant_id?: string | null
        }
        Update: {
          id?: string
          line_total?: number
          order_id?: string
          product_id?: string
          product_snapshot?: Json
          quantity?: number
          unit_price?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_lines_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_lines_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          aprobado_at: string | null
          aprobado_por: string | null
          assigned_driver_id: string | null
          channel: Database["public"]["Enums"]["order_channel"]
          created_at: string
          customer_id: string | null
          delivered_snapshot: Json | null
          delivery_zone_id: string | null
          despachado_at: string | null
          despacho_info: Json | null
          discount: number
          entregado_at: string | null
          firma_aclaracion: string | null
          firma_data: string | null
          firma_fecha: string | null
          guest_email: string | null
          guest_phone: string | null
          id: string
          ideia_commission_amount: number
          ideia_commission_rate: number
          mp_payment_id: string | null
          mp_preference_id: string | null
          muestra_destinatario: string | null
          muestra_observacion: string | null
          notes: string | null
          notes_visible_cliente: boolean
          orden_ruta: number | null
          order_number: string
          payment_confirmed_at: string | null
          payment_confirmed_by: string | null
          payment_declared_at: string | null
          payment_method: string
          payment_proof_url: string | null
          shipping_address_id: string | null
          shipping_fee: number
          shipping_method: string
          shipping_snapshot: Json | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          aprobado_at?: string | null
          aprobado_por?: string | null
          assigned_driver_id?: string | null
          channel: Database["public"]["Enums"]["order_channel"]
          created_at?: string
          customer_id?: string | null
          delivered_snapshot?: Json | null
          delivery_zone_id?: string | null
          despachado_at?: string | null
          despacho_info?: Json | null
          discount?: number
          entregado_at?: string | null
          firma_aclaracion?: string | null
          firma_data?: string | null
          firma_fecha?: string | null
          guest_email?: string | null
          guest_phone?: string | null
          id?: string
          ideia_commission_amount: number
          ideia_commission_rate: number
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          muestra_destinatario?: string | null
          muestra_observacion?: string | null
          notes?: string | null
          notes_visible_cliente?: boolean
          orden_ruta?: number | null
          order_number?: string
          payment_confirmed_at?: string | null
          payment_confirmed_by?: string | null
          payment_declared_at?: string | null
          payment_method?: string
          payment_proof_url?: string | null
          shipping_address_id?: string | null
          shipping_fee?: number
          shipping_method: string
          shipping_snapshot?: Json | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          aprobado_at?: string | null
          aprobado_por?: string | null
          assigned_driver_id?: string | null
          channel?: Database["public"]["Enums"]["order_channel"]
          created_at?: string
          customer_id?: string | null
          delivered_snapshot?: Json | null
          delivery_zone_id?: string | null
          despachado_at?: string | null
          despacho_info?: Json | null
          discount?: number
          entregado_at?: string | null
          firma_aclaracion?: string | null
          firma_data?: string | null
          firma_fecha?: string | null
          guest_email?: string | null
          guest_phone?: string | null
          id?: string
          ideia_commission_amount?: number
          ideia_commission_rate?: number
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          muestra_destinatario?: string | null
          muestra_observacion?: string | null
          notes?: string | null
          notes_visible_cliente?: boolean
          orden_ruta?: number | null
          order_number?: string
          payment_confirmed_at?: string | null
          payment_confirmed_by?: string | null
          payment_declared_at?: string | null
          payment_method?: string
          payment_proof_url?: string | null
          shipping_address_id?: string | null
          shipping_fee?: number
          shipping_method?: string
          shipping_snapshot?: Json | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_aprobado_por_fkey"
            columns: ["aprobado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_assigned_driver_id_fkey"
            columns: ["assigned_driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_delivery_zone_id_fkey"
            columns: ["delivery_zone_id"]
            isOneToOne: false
            referencedRelation: "delivery_zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_payment_confirmed_by_fkey"
            columns: ["payment_confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_shipping_address_id_fkey"
            columns: ["shipping_address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
        ]
      }
      pagos: {
        Row: {
          cliente_id: string
          created_at: string | null
          created_by: string | null
          factura_numero: string | null
          fecha: string
          id: string
          metodo: string
          monto: number
          notas: string | null
          order_id: string | null
          referencia: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string | null
          created_by?: string | null
          factura_numero?: string | null
          fecha?: string
          id?: string
          metodo?: string
          monto: number
          notas?: string | null
          order_id?: string | null
          referencia?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string | null
          created_by?: string | null
          factura_numero?: string | null
          fecha?: string
          id?: string
          metodo?: string
          monto?: number
          notas?: string | null
          order_id?: string | null
          referencia?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pagos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      parametros_globales: {
        Row: {
          actualizado_at: string
          actualizado_por: string | null
          clave: string
          descripcion: string | null
          valor: number
        }
        Insert: {
          actualizado_at?: string
          actualizado_por?: string | null
          clave: string
          descripcion?: string | null
          valor: number
        }
        Update: {
          actualizado_at?: string
          actualizado_por?: string | null
          clave?: string
          descripcion?: string | null
          valor?: number
        }
        Relationships: []
      }
      pipeline_prospectos: {
        Row: {
          canal_objetivo: string
          contacto_email: string | null
          contacto_nombre: string | null
          contacto_telefono: string | null
          convertido_cliente_id: string | null
          created_at: string
          created_by: string | null
          empresa: string
          estado: Database["public"]["Enums"]["prospecto_estado"]
          fecha_proximo_contacto: string | null
          id: string
          motivo_perdida: string | null
          notas: string | null
          preventista_id: string | null
          updated_at: string
          valor_estimado: number | null
          zona: string | null
        }
        Insert: {
          canal_objetivo?: string
          contacto_email?: string | null
          contacto_nombre?: string | null
          contacto_telefono?: string | null
          convertido_cliente_id?: string | null
          created_at?: string
          created_by?: string | null
          empresa: string
          estado?: Database["public"]["Enums"]["prospecto_estado"]
          fecha_proximo_contacto?: string | null
          id?: string
          motivo_perdida?: string | null
          notas?: string | null
          preventista_id?: string | null
          updated_at?: string
          valor_estimado?: number | null
          zona?: string | null
        }
        Update: {
          canal_objetivo?: string
          contacto_email?: string | null
          contacto_nombre?: string | null
          contacto_telefono?: string | null
          convertido_cliente_id?: string | null
          created_at?: string
          created_by?: string | null
          empresa?: string
          estado?: Database["public"]["Enums"]["prospecto_estado"]
          fecha_proximo_contacto?: string | null
          id?: string
          motivo_perdida?: string | null
          notas?: string | null
          preventista_id?: string | null
          updated_at?: string
          valor_estimado?: number | null
          zona?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_prospectos_convertido_cliente_id_fkey"
            columns: ["convertido_cliente_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_prospectos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_prospectos_preventista_id_fkey"
            columns: ["preventista_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plantilla_items: {
        Row: {
          cantidad: number
          created_at: string
          id: string
          plantilla_id: string
          producto_id: string
        }
        Insert: {
          cantidad: number
          created_at?: string
          id?: string
          plantilla_id: string
          producto_id: string
        }
        Update: {
          cantidad?: number
          created_at?: string
          id?: string
          plantilla_id?: string
          producto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plantilla_items_plantilla_id_fkey"
            columns: ["plantilla_id"]
            isOneToOne: false
            referencedRelation: "plantillas_pedido"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plantilla_items_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      plantillas_pedido: {
        Row: {
          cliente_id: string
          created_at: string
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plantillas_pedido_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          bank_alias: string
          bank_cbu: string
          bank_holder: string
          cuit_emisor: string
          id: number
          ideia_commission_rate: number
          updated_at: string
          whatsapp_phone_display: string | null
        }
        Insert: {
          bank_alias?: string
          bank_cbu?: string
          bank_holder?: string
          cuit_emisor?: string
          id?: number
          ideia_commission_rate?: number
          updated_at?: string
          whatsapp_phone_display?: string | null
        }
        Update: {
          bank_alias?: string
          bank_cbu?: string
          bank_holder?: string
          cuit_emisor?: string
          id?: number
          ideia_commission_rate?: number
          updated_at?: string
          whatsapp_phone_display?: string | null
        }
        Relationships: []
      }
      precios_cliente: {
        Row: {
          cliente_id: string
          created_at: string
          created_by: string | null
          descuento_pct: number | null
          id: string
          notas: string | null
          precio_fijo: number | null
          producto_id: string
          tipo: string
          updated_at: string
          vigente_desde: string
          vigente_hasta: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string
          created_by?: string | null
          descuento_pct?: number | null
          id?: string
          notas?: string | null
          precio_fijo?: number | null
          producto_id: string
          tipo?: string
          updated_at?: string
          vigente_desde?: string
          vigente_hasta?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string
          created_by?: string | null
          descuento_pct?: number | null
          id?: string
          notas?: string | null
          precio_fijo?: number | null
          producto_id?: string
          tipo?: string
          updated_at?: string
          vigente_desde?: string
          vigente_hasta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "precios_cliente_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "precios_cliente_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "precios_cliente_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      produccion: {
        Row: {
          cantidad_cajas: number
          created_at: string
          created_by: string | null
          fecha: string
          id: string
          notas: string | null
          producto_id: string
          receta_id: string
        }
        Insert: {
          cantidad_cajas: number
          created_at?: string
          created_by?: string | null
          fecha?: string
          id?: string
          notas?: string | null
          producto_id: string
          receta_id: string
        }
        Update: {
          cantidad_cajas?: number
          created_at?: string
          created_by?: string | null
          fecha?: string
          id?: string
          notas?: string | null
          producto_id?: string
          receta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "produccion_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produccion_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produccion_receta_id_fkey"
            columns: ["receta_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          id: string
          is_active: boolean | null
          name: string
          price_b2b_delta: number | null
          price_b2c_delta: number | null
          product_id: string
          sku: string
          stock: number
        }
        Insert: {
          id?: string
          is_active?: boolean | null
          name: string
          price_b2b_delta?: number | null
          price_b2c_delta?: number | null
          product_id: string
          sku: string
          stock?: number
        }
        Update: {
          id?: string
          is_active?: boolean | null
          name?: string
          price_b2b_delta?: number | null
          price_b2c_delta?: number | null
          product_id?: string
          sku?: string
          stock?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          bolsas_caja: number | null
          categoria: string | null
          category_id: string | null
          codigo: number | null
          cooking_methods: string[] | null
          costo: number | null
          cover_image_url: string | null
          created_at: string
          description: string | null
          divisiones_display: number | null
          es_muestra: boolean
          extra_images: string[] | null
          freezer_required: boolean | null
          gallery_urls: Json | null
          id: string
          is_active: boolean | null
          kg_caja: number | null
          linea_id: number | null
          margen_dist: number | null
          margen_gastro: number | null
          margen_min: number | null
          metadata: Json | null
          min_quantity_b2b: number | null
          mult_bolsas: boolean | null
          name: string
          pkg_bulto: number | null
          pkg_unitario: number | null
          precio_dist: number | null
          precio_gastro: number | null
          precio_lista: number | null
          precio_min: number | null
          presentacion: string | null
          price_b2b: number
          price_b2c: number
          short_description: string | null
          sku: string
          slug: string
          stock_cajas: number
          stock_minimo: number
          u_bolsa: number | null
          unit_label: string | null
          updated_at: string
          vida_util_dias: number
          weight_grams: number | null
        }
        Insert: {
          bolsas_caja?: number | null
          categoria?: string | null
          category_id?: string | null
          codigo?: number | null
          cooking_methods?: string[] | null
          costo?: number | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          divisiones_display?: number | null
          es_muestra?: boolean
          extra_images?: string[] | null
          freezer_required?: boolean | null
          gallery_urls?: Json | null
          id?: string
          is_active?: boolean | null
          kg_caja?: number | null
          linea_id?: number | null
          margen_dist?: number | null
          margen_gastro?: number | null
          margen_min?: number | null
          metadata?: Json | null
          min_quantity_b2b?: number | null
          mult_bolsas?: boolean | null
          name: string
          pkg_bulto?: number | null
          pkg_unitario?: number | null
          precio_dist?: number | null
          precio_gastro?: number | null
          precio_lista?: number | null
          precio_min?: number | null
          presentacion?: string | null
          price_b2b: number
          price_b2c: number
          short_description?: string | null
          sku: string
          slug: string
          stock_cajas?: number
          stock_minimo?: number
          u_bolsa?: number | null
          unit_label?: string | null
          updated_at?: string
          vida_util_dias?: number
          weight_grams?: number | null
        }
        Update: {
          bolsas_caja?: number | null
          categoria?: string | null
          category_id?: string | null
          codigo?: number | null
          cooking_methods?: string[] | null
          costo?: number | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          divisiones_display?: number | null
          es_muestra?: boolean
          extra_images?: string[] | null
          freezer_required?: boolean | null
          gallery_urls?: Json | null
          id?: string
          is_active?: boolean | null
          kg_caja?: number | null
          linea_id?: number | null
          margen_dist?: number | null
          margen_gastro?: number | null
          margen_min?: number | null
          metadata?: Json | null
          min_quantity_b2b?: number | null
          mult_bolsas?: boolean | null
          name?: string
          pkg_bulto?: number | null
          pkg_unitario?: number | null
          precio_dist?: number | null
          precio_gastro?: number | null
          precio_lista?: number | null
          precio_min?: number | null
          presentacion?: string | null
          price_b2b?: number
          price_b2c?: number
          short_description?: string | null
          sku?: string
          slug?: string
          stock_cajas?: number
          stock_minimo?: number
          u_bolsa?: number | null
          unit_label?: string | null
          updated_at?: string
          vida_util_dias?: number
          weight_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_linea_id_fkey"
            columns: ["linea_id"]
            isOneToOne: false
            referencedRelation: "lineas_producto"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          b2b_status: string | null
          canal: Database["public"]["Enums"]["client_canal"] | null
          canal_id: string | null
          comision_pct_override: number | null
          comision_preventista_pct: number | null
          created_at: string
          descuento_extra_pct: number
          direccion_calle: string | null
          direccion_ciudad: string | null
          direccion_numero: string | null
          direccion_piso: string | null
          document_number: string | null
          document_type: string | null
          full_name: string | null
          id: string
          notas_internas: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          vendedor_id: string | null
          zona_id: string | null
        }
        Insert: {
          b2b_status?: string | null
          canal?: Database["public"]["Enums"]["client_canal"] | null
          canal_id?: string | null
          comision_pct_override?: number | null
          comision_preventista_pct?: number | null
          created_at?: string
          descuento_extra_pct?: number
          direccion_calle?: string | null
          direccion_ciudad?: string | null
          direccion_numero?: string | null
          direccion_piso?: string | null
          document_number?: string | null
          document_type?: string | null
          full_name?: string | null
          id: string
          notas_internas?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          vendedor_id?: string | null
          zona_id?: string | null
        }
        Update: {
          b2b_status?: string | null
          canal?: Database["public"]["Enums"]["client_canal"] | null
          canal_id?: string | null
          comision_pct_override?: number | null
          comision_preventista_pct?: number | null
          created_at?: string
          descuento_extra_pct?: number
          direccion_calle?: string | null
          direccion_ciudad?: string | null
          direccion_numero?: string | null
          direccion_piso?: string | null
          document_number?: string | null
          document_type?: string | null
          full_name?: string | null
          id?: string
          notas_internas?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          vendedor_id?: string | null
          zona_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_canal_id_fkey"
            columns: ["canal_id"]
            isOneToOne: false
            referencedRelation: "canales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_zona_id_fkey"
            columns: ["zona_id"]
            isOneToOne: false
            referencedRelation: "delivery_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      recepciones: {
        Row: {
          created_at: string
          created_by: string | null
          fecha: string
          id: string
          notas: string | null
          numero: string
          otros_impuestos: number
          proveedor: string
          tipo: string
          total: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          fecha?: string
          id?: string
          notas?: string | null
          numero: string
          otros_impuestos?: number
          proveedor: string
          tipo: string
          total?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          fecha?: string
          id?: string
          notas?: string | null
          numero?: string
          otros_impuestos?: number
          proveedor?: string
          tipo?: string
          total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recepciones_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recepciones_items: {
        Row: {
          cantidad: number
          fecha_vencimiento: string | null
          id: string
          insumo_id: string
          iva_pct: number
          precio_unitario: number
          recepcion_id: string
          subtotal: number | null
          unidad: string
        }
        Insert: {
          cantidad: number
          fecha_vencimiento?: string | null
          id?: string
          insumo_id: string
          iva_pct?: number
          precio_unitario?: number
          recepcion_id: string
          subtotal?: number | null
          unidad: string
        }
        Update: {
          cantidad?: number
          fecha_vencimiento?: string | null
          id?: string
          insumo_id?: string
          iva_pct?: number
          precio_unitario?: number
          recepcion_id?: string
          subtotal?: number | null
          unidad?: string
        }
        Relationships: [
          {
            foreignKeyName: "recepciones_items_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recepciones_items_recepcion_id_fkey"
            columns: ["recepcion_id"]
            isOneToOne: false
            referencedRelation: "recepciones"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_ingredients: {
        Row: {
          cantidad: number
          costo: number
          id: string
          insumo_id: string | null
          nombre: string | null
          recipe_id: string
          unidad: string
        }
        Insert: {
          cantidad?: number
          costo?: number
          id?: string
          insumo_id?: string | null
          nombre?: string | null
          recipe_id: string
          unidad?: string
        }
        Update: {
          cantidad?: number
          costo?: number
          id?: string
          insumo_id?: string | null
          nombre?: string | null
          recipe_id?: string
          unidad?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_steps: {
        Row: {
          description: string
          id: string
          minutes: number
          notes: string | null
          recipe_id: string
          step_order: number
        }
        Insert: {
          description: string
          id?: string
          minutes?: number
          notes?: string | null
          recipe_id: string
          step_order: number
        }
        Update: {
          description?: string
          id?: string
          minutes?: number
          notes?: string | null
          recipe_id?: string
          step_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "recipe_steps_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          product_id: string
          updated_at: string
          vida_util_dias: number
          yield_cajas: number
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          product_id: string
          updated_at?: string
          vida_util_dias?: number
          yield_cajas?: number
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          product_id?: string
          updated_at?: string
          vida_util_dias?: number
          yield_cajas?: number
        }
        Relationships: [
          {
            foreignKeyName: "recipes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_goals: {
        Row: {
          id: string
          mes: string
          objetivo: number
          vendedor_id: string
        }
        Insert: {
          id?: string
          mes: string
          objetivo?: number
          vendedor_id: string
        }
        Update: {
          id?: string
          mes?: string
          objetivo?: number
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_goals_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          order_id: string | null
          product_id: string
          qty: number
          type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          product_id: string
          qty: number
          type: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          product_id?: string
          qty?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      volume_discounts: {
        Row: {
          activo: boolean
          descuento_pct: number
          id: string
          label: string
          min_cajas: number
        }
        Insert: {
          activo?: boolean
          descuento_pct: number
          id?: string
          label: string
          min_cajas: number
        }
        Update: {
          activo?: boolean
          descuento_pct?: number
          id?: string
          label?: string
          min_cajas?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calc_precio_b2b: {
        Args: {
          p_bolsas_caja: number
          p_comision?: number
          p_costo: number
          p_flete_kg: number
          p_kg_caja: number
          p_margen: number
          p_mult_bolsas: boolean
          p_pkg_bulto: number
          p_pkg_unitario: number
        }
        Returns: Json
      }
      consume_lote_stock: {
        Args: { p_product_id: string; p_qty: number }
        Returns: undefined
      }
      current_user_role: { Args: never; Returns: string }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      decrement_stock:
        | { Args: { p_product_id: string; p_qty: number }; Returns: boolean }
        | { Args: { p_product_id: string; p_qty: number }; Returns: undefined }
      generate_order_number: { Args: never; Returns: string }
      increment_stock:
        | { Args: { p_product_id: string; p_qty: number }; Returns: undefined }
        | { Args: { p_product_id: string; p_qty: number }; Returns: undefined }
      is_admin: { Args: never; Returns: boolean }
      is_enminutas_admin: { Args: never; Returns: boolean }
      minutos_para_producir: {
        Args: { p_cajas: number; p_product_id: string }
        Returns: number
      }
    }
    Enums: {
      b2b_status: "pending" | "approved" | "rejected" | "suspended"
      client_canal: "dist" | "gastro" | "min"
      order_channel:
        | "b2c_nacional"
        | "b2b_mayorista"
        | "pedido_ya_local"
        | "muestra"
      order_status:
        | "pending_payment"
        | "payment_review"
        | "paid"
        | "preparing"
        | "ready"
        | "in_delivery"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "refunded"
        | "aprobado"
        | "enviado_prod"
        | "despachado"
        | "en_distribucion"
        | "entrega_parcial"
        | "liquidado"
      prospecto_estado:
        | "nuevo"
        | "contactado"
        | "interesado"
        | "propuesta_enviada"
        | "ganado"
        | "perdido"
      user_role:
        | "customer_b2c"
        | "customer_b2b"
        | "repartidor"
        | "admin_enminutas"
        | "admin_ideaia"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      b2b_status: ["pending", "approved", "rejected", "suspended"],
      client_canal: ["dist", "gastro", "min"],
      order_channel: [
        "b2c_nacional",
        "b2b_mayorista",
        "pedido_ya_local",
        "muestra",
      ],
      order_status: [
        "pending_payment",
        "payment_review",
        "paid",
        "preparing",
        "ready",
        "in_delivery",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
        "aprobado",
        "enviado_prod",
        "despachado",
        "en_distribucion",
        "entrega_parcial",
        "liquidado",
      ],
      prospecto_estado: [
        "nuevo",
        "contactado",
        "interesado",
        "propuesta_enviada",
        "ganado",
        "perdido",
      ],
      user_role: [
        "customer_b2c",
        "customer_b2b",
        "repartidor",
        "admin_enminutas",
        "admin_ideaia",
      ],
    },
  },
} as const

