import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,

        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#dddddd',
        },

        tabBarActiveTintColor: '#6d28d9',
        tabBarInactiveTintColor: '#888888',

        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
      }}
    >
      {/* INÍCIO */}
      <Tabs.Screen
        name="inicio"
        options={{
          title: 'INÍCIO',
          tabBarLabel: 'INÍCIO',

          tabBarIcon: ({ color }) => (
            <IconSymbol
              size={27}
              name="house"
              color={color}
            />
          ),
        }}
      />

      {/* EU VOU */}
      <Tabs.Screen
        name="planejamento"
        options={{
          title: 'EU VOU!',
          tabBarLabel: 'EU VOU!',

          tabBarIcon: ({ color }) => (
            <IconSymbol
              size={27}
              name="airplane"
              color={color}
            />
          ),
        }}
      />

      {/* ROLÊ */}
      <Tabs.Screen
        name="locais"
        options={{
          title: 'ROLÊ!',
          tabBarLabel: 'ROLÊ!',

          tabBarIcon: ({ color }) => (
            <IconSymbol
              size={28}
              name="car"
              color={color}
            />
          ),
        }}
      />

      {/* maIA */}
      <Tabs.Screen
        name="maia"
        options={{
          title: 'maIA',
          tabBarLabel: 'maIA',

          tabBarIcon: ({ color }) => (
            <IconSymbol
              size={27}
              name="sparkles"
              color={color}
            />
          ),
        }}
      />

      {/* EU CONTO */}
      <Tabs.Screen
        name="conto"
        options={{
          title: 'EU CONTO!',
          tabBarLabel: 'EU CONTO!',

          tabBarIcon: ({ color }) => (
            <IconSymbol
              size={27}
              name="star"
              color={color}
            />
          ),
        }}
      />

      {/* SDD - que são as lembranças */}
      <Tabs.Screen
        name="sdd"
        options={{
          title: 'SDD <3',
          tabBarLabel: 'SDD <3',

          tabBarIcon: ({ color }) => (
            <IconSymbol
              size={27}
              name="photo.on.rectangle.angled"
              color={color}
            />
          ),
        }}
      />

      {/* PERFIL - ACESSADO PELA FOTO DA HOME */}
      <Tabs.Screen
        name="perfil"
        options={{
          href: null,
        }}
      />

      {/* ROTA INTERNA - NÃO APARECE NA BARRA */}
      <Tabs.Screen
        name="viagens"
        options={{
          href: null,
        }}
      />

      {/* ROTA INTERNA - NÃO APARECE NA BARRA */}
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}