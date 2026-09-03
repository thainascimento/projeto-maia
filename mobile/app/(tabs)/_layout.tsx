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
        name="index"
        options={{
          title: 'INÍCIO',
          tabBarLabel: 'INÍCIO',
          tabBarIcon: ({ color }) => (
            <IconSymbol
              size={27}
              name="house.fill"
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
              name="map.fill"
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
              name="calendar"
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
              name="star.fill"
              color={color}
            />
          ),
        }}
      />

      {/* PERFIL */}
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'PERFIL',
          tabBarLabel: 'PERFIL',
          tabBarIcon: ({ color }) => (
            <IconSymbol
              size={27}
              name="person.fill"
              color={color}
            />
          ),
        }}
      />

      {/* ROTA INTERNA - NÃO APARECE NA BARRA */}
      <Tabs.Screen
        name="viagens"
        options={{
          href: null,
        }}
      />

      {/* Se explore.tsx não for uma aba,
          também escondemos da barra. */}
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}