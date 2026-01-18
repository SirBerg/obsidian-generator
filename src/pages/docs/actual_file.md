---
layout: ./src/layouts/Layout.astro
---
## Container
Generische Datenstrukturen heißen Container in Java (diese leben in java.util). Beispiel:
- Arrays
- Vector
- Stack
## Einteilung der Datenstrukturen
Es gibt oberbegriffe für die Datenstrukturen:
- Listen (Interface List\<E>), speichern Elemente der Reihe nach entweder in einem Array oder als Linkedlist ab.
- Mengen (Interface Set\<E>) enthalten keine doppelten Elemente (Bitset, Treeset, etc.)
- Assoziativspeicher (Interface Map\<K,V>) ordnen einen Schlüsselk K (key) einem Wert V(value) zu (z.B. Hashmap)
- Schlangen (Interface Queue\<E>) sind hauptsächlich dafür gedacht, Objekte am Ende hinzuzufügen und am Anfang wegzunehmen
  Alle Container brauchen einen specifier für ihren Typen:
```java
Vector<Integer> v = new Vector<>()
```
### Beispiel: LinkedList
```java
LinkedList<Integer> zahlen = new LinkedList<Integer>();
zahlen.add(17);
zahlen.add(5);
zahlen.add(42);
zahlen.add(333);
for (var element : zahlen){
	System.out.print(element + " ");
}
```
Würde ausgeben:
```text
17 5 42 333
```
Darstellung:
![[../../../Assets/Screenshot 2025-12-13 at 16.56.05.png]]
## Auswahl einer Container klasse
Es gibt ein paar parameter um die auswahl einfacher zu gestalten:
- Ist eine Sequenz, also eine feste Ordnung, gefordert? Wenn ja, nimm eine Liste
- Soll es einen schnellen Zugriff über einen Index geben? Wenn ja ist die ArrayList gegenüber der LinkedList im Vorteil
- Werden oft am Ende und Anfang Elemente eingefügt? Dann kann LinkedList punkten
- Wenn eine Reihenfolge der Elemente uninteressant ist, aber schnell entschieden werden soll ob ein Element Teil einer Menge ist, erweist sich HashSet als interessant
- Sollen Elemente nur einmal vorkommen und immer sortiert bleiben? Dann ist TreeSet eine gut Wahl
- Wenn es eine Assoziation zwischen Schlüssel und Elemente geben muss, ist eine Map von Vorteil

1. test
2. test2