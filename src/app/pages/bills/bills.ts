import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BillsService } from '../../services/bills.service';
import { ParticipantsService } from '../../services/participants.service';
import { BillItemsService } from '../../services/bill-items.service';
import { PaymentsService } from '../../services/payments.service';
import { ItemConsumersService } from '../../services/item-consumers.service';
import { ChargesService } from '../../services/charges.service';
import { Bill, BillUpdate } from '../../models/bill';
import { Participant } from '../../models/participant';
import { BillItem } from '../../models/bill-item';
import { Payment } from '../../models/payment';
import { Charge } from '../../models/charge';

// Settlement calculation interface
export interface ParticipantSettlement {
  participantId: string;
  name: string;
  itemsShare: number;      // Their share of items consumed
  chargesShare: number;    // Their share of charges (tax + tip - discount)
  totalShare: number;      // Total they should pay
  totalPaid: number;       // What they've already paid
  balance: number;         // Positive = owes, Negative = is owed
}

export interface SettlementTransfer {
  from: string;
  fromName: string;
  to: string;
  toName: string;
  amount: number;
}

@Component({
  selector: 'app-bills',
  imports: [CommonModule, FormsModule],
  templateUrl: './bills.html',
  styleUrl: './bills.css',
})

export class BillsComponent {
  constructor(
    private billsService: BillsService,
    private participantsService: ParticipantsService,
    private billItemsService: BillItemsService,
    private paymentsService: PaymentsService,
    private itemConsumersService: ItemConsumersService,
    private chargesService: ChargesService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) { }

  bills: Bill[] = [];
  loading = false;
  error?: string;

  // Dialog state
  isDialogOpen = false;
  newBillTitle = '';
  newBillCurrency = 'PKR';

  // Participants dialog state
  isParticipantsDialogOpen = false;
  selectedBill: Bill | null = null;
  participants: Participant[] = [];
  participantsLoading = false;
  newParticipantName = '';

  // Items dialog state
  isItemsDialogOpen = false;
  items: BillItem[] = [];
  itemsLoading = false;
  newItemDescription = '';
  newItemPrice: number | null = null;
  billTotal = 0;

  // Item consumers state
  itemConsumers: Map<string, string[]> = new Map(); // itemId -> participantIds[]
  selectedItemForConsumers: BillItem | null = null;
  isConsumersDialogOpen = false;

  // Payments dialog state
  isPaymentsDialogOpen = false;
  payments: Payment[] = [];
  paymentsLoading = false;
  newPaymentParticipantId = '';
  newPaymentAmount: number | null = null;
  paymentsTotal = 0;
  paymentsBillTotal = 0;

  // Charges dialog state
  isChargesDialogOpen = false;
  charges: Charge | null = null;
  chargesLoading = false;
  taxCents: number = 0;
  tipCents: number = 0;
  discountCents: number = 0;

  // Settlement summary state
  isSummaryDialogOpen = false;
  summaryLoading = false;
  settlements: ParticipantSettlement[] = [];
  transfers: SettlementTransfer[] = [];
  summaryItemsTotal = 0;
  summaryChargesTotal = 0;
  summaryGrandTotal = 0;

  async ngOnInit() {
    await this.loadBills();
  }

  goToBill(billId: string) {
    this.router.navigate(['/bill', billId]);
  }

  async loadBills() {
    this.loading = true;
    const { data, error } = await this.billsService.listBills();
    if (error) {
      this.error = error.message;
      this.bills = [];
    } else {
      this.bills = data ?? [];
      this.error = undefined;
    }
    this.loading = false;
    this.cdr.detectChanges();
  }

  async getBillById(billId: string): Promise<Bill | null> {
    const { data, error } = await this.billsService.getBill(billId);
    if (error) { this.error = error.message; return null; }
    this.error = undefined;
    return data as Bill;
  }

  async addBill(title: string, currency = 'PKR') {
    const { error } = await this.billsService.createBill(title, currency);
    if (!error) await this.loadBills();
    else this.error = error.message;
  }

  async updateBill(billId: string, title?: string, currency?: string) {
    const updates: BillUpdate = {};
    if (title !== undefined) updates.title = title;
    if (currency !== undefined) updates.currency = currency;

    const { error } = await this.billsService.updateBill(billId, updates);
    if (!error) await this.loadBills();
    else this.error = error.message;
  }

  async deleteBill(billId: string) {
    const prev = this.bills;
    this.bills = this.bills.filter(b => b.id !== billId);

    const { error } = await this.billsService.deleteBill(billId);
    if (error) {
      this.error = error.message;
      this.bills = prev; // revert on error
    }
  }

  // Dialog methods
  openDialog() {
    this.isDialogOpen = true;
    this.newBillTitle = '';
    this.newBillCurrency = 'PKR';
  }

  closeDialog() {
    this.isDialogOpen = false;
    this.newBillTitle = '';
    this.newBillCurrency = 'PKR';
  }

  async submitBill() {
    if (this.newBillTitle.trim()) {
      await this.addBill(this.newBillTitle.trim(), this.newBillCurrency);
      this.closeDialog();
    }
  }

  // Participants dialog methods
  async openParticipantsDialog(bill: Bill) {
    this.selectedBill = bill;
    this.isParticipantsDialogOpen = true;
    this.newParticipantName = '';
    await this.loadParticipants(bill.id);
  }

  closeParticipantsDialog() {
    this.isParticipantsDialogOpen = false;
    this.selectedBill = null;
    this.participants = [];
    this.newParticipantName = '';
  }

  async loadParticipants(billId: string) {
    this.participantsLoading = true;
    const { data, error } = await this.participantsService.listParticipants(billId);
    if (error) {
      this.error = error.message;
      this.participants = [];
    } else {
      this.participants = data ?? [];
    }
    this.participantsLoading = false;
    this.cdr.detectChanges();
  }

  async addParticipant() {
    if (!this.selectedBill || !this.newParticipantName.trim()) return;

    const { error } = await this.participantsService.addParticipant({
      bill_id: this.selectedBill.id,
      name: this.newParticipantName.trim()
    });

    if (error) {
      this.error = error.message;
    } else {
      this.newParticipantName = '';
      await this.loadParticipants(this.selectedBill.id);
    }
    this.cdr.detectChanges();
  }

  async removeParticipant(participantId: string) {
    if (!this.selectedBill) return;

    const prev = this.participants;
    this.participants = this.participants.filter(p => p.id !== participantId);
    this.cdr.detectChanges();

    const { error } = await this.participantsService.removeParticipant(participantId);
    if (error) {
      this.error = error.message;
      this.participants = prev;
      this.cdr.detectChanges();
    }
  }

  // Items dialog methods
  async openItemsDialog(bill: Bill) {
    this.selectedBill = bill;
    this.isItemsDialogOpen = true;
    this.resetItemForm();
    await this.loadItems(bill.id);
    await this.loadParticipantsForItems(bill.id);
    await this.loadAllItemConsumers(bill.id);
  }

  closeItemsDialog() {
    this.isItemsDialogOpen = false;
    this.selectedBill = null;
    this.items = [];
    this.participants = [];
    this.itemConsumers.clear();
    this.resetItemForm();
  }

  resetItemForm() {
    this.newItemDescription = '';
    this.newItemPrice = null;
  }

  async loadItems(billId: string) {
    this.itemsLoading = true;
    const { data, error } = await this.billItemsService.listItems(billId);
    if (error) {
      this.error = error.message;
      this.items = [];
    } else {
      this.items = data ?? [];
      this.billTotal = this.items.reduce((sum, item) => sum + (item.price || 0), 0);
    }
    this.itemsLoading = false;
    this.cdr.detectChanges();
  }

  async loadParticipantsForItems(billId: string) {
    const { data } = await this.participantsService.listParticipants(billId);
    this.participants = data ?? [];
    this.cdr.detectChanges();
  }

  async addItem() {
    if (!this.selectedBill || !this.newItemDescription.trim() || !this.newItemPrice) return;

    const { error } = await this.billItemsService.addItem({
      bill_id: this.selectedBill.id,
      name: this.newItemDescription.trim(),
      price: this.newItemPrice
    });

    if (error) {
      this.error = error.message;
    } else {
      this.resetItemForm();
      await this.loadItems(this.selectedBill.id);
    }
    this.cdr.detectChanges();
  }

  async removeItem(itemId: string) {
    if (!this.selectedBill) return;

    const prev = this.items;
    this.items = this.items.filter(i => i.id !== itemId);
    this.billTotal = this.items.reduce((sum, item) => sum + (item.price || 0), 0);
    this.cdr.detectChanges();

    const { error } = await this.billItemsService.removeItem(itemId);
    if (error) {
      this.error = error.message;
      this.items = prev;
      this.billTotal = this.items.reduce((sum, item) => sum + (item.price || 0), 0);
      this.cdr.detectChanges();
    }
  }

  // Payments dialog methods
  async openPaymentsDialog(bill: Bill) {
    this.selectedBill = bill;
    this.isPaymentsDialogOpen = true;
    this.resetPaymentForm();
    await this.loadPayments(bill.id);
    await this.loadParticipantsForPayments(bill.id);
    await this.loadBillTotalForPayments(bill.id);
  }

  closePaymentsDialog() {
    this.isPaymentsDialogOpen = false;
    this.selectedBill = null;
    this.payments = [];
    this.participants = [];
    this.paymentsBillTotal = 0;
    this.resetPaymentForm();
  }

  resetPaymentForm() {
    this.newPaymentParticipantId = '';
    this.newPaymentAmount = null;
  }

  async loadPayments(billId: string) {
    this.paymentsLoading = true;
    const { data, error } = await this.paymentsService.listPayments(billId);
    if (error) {
      this.error = error.message;
      this.payments = [];
    } else {
      this.payments = data ?? [];
      this.paymentsTotal = this.payments.reduce((sum, p) => sum + (p.amount_cents || 0), 0);
    }
    this.paymentsLoading = false;
    this.cdr.detectChanges();
  }

  async loadParticipantsForPayments(billId: string) {
    const { data } = await this.participantsService.listParticipants(billId);
    this.participants = data ?? [];
    this.cdr.detectChanges();
  }

  async loadBillTotalForPayments(billId: string) {
    const { data } = await this.billItemsService.listItems(billId);
    this.paymentsBillTotal = (data ?? []).reduce((sum, item) => sum + (item.price || 0), 0);
    this.cdr.detectChanges();
  }

  get remainingAmount(): number {
    return this.paymentsBillTotal - this.paymentsTotal;
  }

  async addPayment() {
    if (!this.selectedBill || !this.newPaymentParticipantId || !this.newPaymentAmount) return;

    // Validate payment doesn't exceed remaining amount
    if (this.newPaymentAmount > this.remainingAmount) {
      this.error = `Payment cannot exceed remaining amount (${this.remainingAmount} ${this.selectedBill.currency})`;
      this.cdr.detectChanges();
      return;
    }

    const { error } = await this.paymentsService.addPayment({
      bill_id: this.selectedBill.id,
      participant_id: this.newPaymentParticipantId,
      amount_cents: this.newPaymentAmount
    });

    if (error) {
      this.error = error.message;
    } else {
      this.resetPaymentForm();
      await this.loadPayments(this.selectedBill.id);
    }
    this.cdr.detectChanges();
  }

  async removePayment(paymentId: string) {
    if (!this.selectedBill) return;

    const prev = this.payments;
    this.payments = this.payments.filter(p => p.id !== paymentId);
    this.paymentsTotal = this.payments.reduce((sum, p) => sum + (p.amount_cents || 0), 0);
    this.cdr.detectChanges();

    const { error } = await this.paymentsService.removePayment(paymentId);
    if (error) {
      this.error = error.message;
      this.payments = prev;
      this.paymentsTotal = this.payments.reduce((sum, p) => sum + (p.amount_cents || 0), 0);
      this.cdr.detectChanges();
    }
  }

  getParticipantName(participantId: string): string {
    const participant = this.participants.find(p => p.id === participantId);
    return participant?.name ?? 'Unknown';
  }

  // Item Consumers methods
  async loadAllItemConsumers(billId: string) {
    this.itemConsumers.clear();

    // Load consumers for each item
    for (const item of this.items) {
      const { data } = await this.itemConsumersService.getItemConsumers(item.id);
      if (data && data.length > 0) {
        this.itemConsumers.set(item.id, data.map(c => c.participant_id));
      }
    }
    this.cdr.detectChanges();
  }

  getItemConsumerNames(itemId: string): string {
    const consumerIds = this.itemConsumers.get(itemId) || [];
    if (consumerIds.length === 0) return 'No one assigned';
    if (consumerIds.length === this.participants.length) return 'Everyone';

    return consumerIds
      .map(id => this.getParticipantName(id))
      .join(', ');
  }

  getItemConsumerCount(itemId: string): number {
    return this.itemConsumers.get(itemId)?.length || 0;
  }

  openConsumersDialog(item: BillItem) {
    this.selectedItemForConsumers = item;
    this.isConsumersDialogOpen = true;
  }

  closeConsumersDialog() {
    this.selectedItemForConsumers = null;
    this.isConsumersDialogOpen = false;
  }

  isParticipantConsumer(itemId: string, participantId: string): boolean {
    const consumers = this.itemConsumers.get(itemId) || [];
    return consumers.includes(participantId);
  }

  async toggleConsumer(itemId: string, participantId: string) {
    const consumers = this.itemConsumers.get(itemId) || [];
    let newConsumers: string[];

    if (consumers.includes(participantId)) {
      newConsumers = consumers.filter(id => id !== participantId);
    } else {
      newConsumers = [...consumers, participantId];
    }

    // Update locally first
    this.itemConsumers.set(itemId, newConsumers);
    this.cdr.detectChanges();

    // Update in database
    const { error } = await this.itemConsumersService.setItemConsumers(itemId, newConsumers);
    if (error) {
      this.error = error.message;
      // Revert on error
      this.itemConsumers.set(itemId, consumers);
      this.cdr.detectChanges();
    }
  }

  async selectAllConsumers(itemId: string) {
    const allParticipantIds = this.participants.map(p => p.id);
    this.itemConsumers.set(itemId, allParticipantIds);
    this.cdr.detectChanges();

    const { error } = await this.itemConsumersService.setItemConsumers(itemId, allParticipantIds);
    if (error) {
      this.error = error.message;
    }
  }

  async clearAllConsumers(itemId: string) {
    this.itemConsumers.set(itemId, []);
    this.cdr.detectChanges();

    const { error } = await this.itemConsumersService.setItemConsumers(itemId, []);
    if (error) {
      this.error = error.message;
    }
  }

  // Charges dialog methods
  async openChargesDialog(bill: Bill) {
    this.selectedBill = bill;
    this.isChargesDialogOpen = true;
    await this.loadCharges(bill.id);
  }

  closeChargesDialog() {
    this.isChargesDialogOpen = false;
    this.selectedBill = null;
    this.charges = null;
    this.taxCents = 0;
    this.tipCents = 0;
    this.discountCents = 0;
  }

  async loadCharges(billId: string) {
    this.chargesLoading = true;
    const { data, error } = await this.chargesService.getCharges(billId);

    if (data) {
      this.charges = data;
      this.taxCents = data.tax_cents || 0;
      this.tipCents = data.tip_cents || 0;
      this.discountCents = data.discount_cents || 0;
    } else {
      // No charges exist yet, use defaults
      this.charges = null;
      this.taxCents = 0;
      this.tipCents = 0;
      this.discountCents = 0;
    }

    this.chargesLoading = false;
    this.cdr.detectChanges();
  }

  async saveCharges() {
    if (!this.selectedBill) return;

    const { error } = await this.chargesService.upsertCharges({
      bill_id: this.selectedBill.id,
      tax_cents: this.taxCents,
      tip_cents: this.tipCents,
      discount_cents: this.discountCents
    });

    if (error) {
      this.error = error.message;
    } else {
      this.closeChargesDialog();
    }
    this.cdr.detectChanges();
  }

  get chargesTotal(): number {
    return this.taxCents + this.tipCents - this.discountCents;
  }

  // Settlement Summary methods
  async openSummaryDialog(bill: Bill) {
    this.selectedBill = bill;
    this.isSummaryDialogOpen = true;
    this.summaryLoading = true;
    this.cdr.detectChanges();

    await this.calculateSettlement(bill.id);

    this.summaryLoading = false;
    this.cdr.detectChanges();
  }

  closeSummaryDialog() {
    this.isSummaryDialogOpen = false;
    this.selectedBill = null;
    this.settlements = [];
    this.transfers = [];
    this.summaryItemsTotal = 0;
    this.summaryChargesTotal = 0;
    this.summaryGrandTotal = 0;
  }

  async calculateSettlement(billId: string) {
    // Load all required data
    const [participantsRes, itemsRes, paymentsRes, chargesRes] = await Promise.all([
      this.participantsService.listParticipants(billId),
      this.billItemsService.listItems(billId),
      this.paymentsService.listPayments(billId),
      this.chargesService.getCharges(billId)
    ]);

    const participants = participantsRes.data ?? [];
    const items = itemsRes.data ?? [];
    const payments = paymentsRes.data ?? [];
    const charges = chargesRes.data;

    // Load item consumers for each item
    const itemConsumersMap = new Map<string, string[]>();
    for (const item of items) {
      const { data } = await this.itemConsumersService.getItemConsumers(item.id);
      if (data && data.length > 0) {
        itemConsumersMap.set(item.id, data.map(c => c.participant_id));
      }
    }

    // Calculate totals
    this.summaryItemsTotal = items.reduce((sum, item) => sum + (item.price || 0), 0);
    this.summaryChargesTotal = charges
      ? (charges.tax_cents + charges.tip_cents - charges.discount_cents)
      : 0;
    this.summaryGrandTotal = this.summaryItemsTotal + this.summaryChargesTotal;

    // Calculate each participant's share
    const settlementMap = new Map<string, ParticipantSettlement>();

    // Initialize settlements for all participants
    for (const p of participants) {
      settlementMap.set(p.id, {
        participantId: p.id,
        name: p.name,
        itemsShare: 0,
        chargesShare: 0,
        totalShare: 0,
        totalPaid: 0,
        balance: 0
      });
    }

    // Calculate items share for each participant
    for (const item of items) {
      const consumers = itemConsumersMap.get(item.id) || [];
      if (consumers.length > 0) {
        const sharePerPerson = (item.price || 0) / consumers.length;
        for (const consumerId of consumers) {
          const settlement = settlementMap.get(consumerId);
          if (settlement) {
            settlement.itemsShare += sharePerPerson;
          }
        }
      } else {
        // If no consumers assigned, split equally among all participants
        const sharePerPerson = (item.price || 0) / participants.length;
        for (const p of participants) {
          const settlement = settlementMap.get(p.id);
          if (settlement) {
            settlement.itemsShare += sharePerPerson;
          }
        }
      }
    }

    // Distribute charges equally among all participants
    if (participants.length > 0 && this.summaryChargesTotal !== 0) {
      const chargesPerPerson = this.summaryChargesTotal / participants.length;
      for (const [, settlement] of settlementMap) {
        settlement.chargesShare = chargesPerPerson;
      }
    }

    // Calculate payments for each participant
    for (const payment of payments) {
      const settlement = settlementMap.get(payment.participant_id);
      if (settlement) {
        settlement.totalPaid += payment.amount_cents || 0;
      }
    }

    // Calculate final balances
    for (const [, settlement] of settlementMap) {
      settlement.totalShare = settlement.itemsShare + settlement.chargesShare;
      settlement.balance = settlement.totalShare - settlement.totalPaid;
    }

    this.settlements = Array.from(settlementMap.values());

    // Calculate suggested transfers to settle up
    this.calculateTransfers();
  }

  calculateTransfers() {
    // Separate into debtors (owe money) and creditors (are owed money)
    const debtors = this.settlements
      .filter(s => s.balance > 0.01)
      .map(s => ({ ...s }))
      .sort((a, b) => b.balance - a.balance);

    const creditors = this.settlements
      .filter(s => s.balance < -0.01)
      .map(s => ({ ...s, balance: Math.abs(s.balance) }))
      .sort((a, b) => b.balance - a.balance);

    this.transfers = [];

    // Simple greedy algorithm to minimize transfers
    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];

      const amount = Math.min(debtor.balance, creditor.balance);

      if (amount > 0.01) {
        this.transfers.push({
          from: debtor.participantId,
          fromName: debtor.name,
          to: creditor.participantId,
          toName: creditor.name,
          amount: Math.round(amount)
        });
      }

      debtor.balance -= amount;
      creditor.balance -= amount;

      if (debtor.balance < 0.01) i++;
      if (creditor.balance < 0.01) j++;
    }
  }
}